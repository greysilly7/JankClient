import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

const translationsDir = 'translations';
const distWebpageDir = 'dist/webpage';
const distTranslationsDir = path.join(distWebpageDir, 'translations');

export async function runBuildExtras() {
    console.log('Running build extras...');

    try {
        await fs.mkdir(distWebpageDir, { recursive: true });
        console.log(`Ensured directory exists: ${distWebpageDir}`);
        await fs.mkdir(distTranslationsDir, { recursive: true });


        try {
            await fs.access(translationsDir);
            console.log(`Processing translations from: ${translationsDir}`);
            const dirents = await fs.readdir(translationsDir, { withFileTypes: true });
            const jsonFiles = dirents.filter(dirent => dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'qqq.json');

            const langobj = {};
            const copyPromises = [];
            const processPromises = [];

            for (const dirent of jsonFiles) {
                const lang = dirent.name;
                const filePath = path.join(translationsDir, lang);
                const langCode = path.basename(lang, '.json');
                const sourcePath = path.join(translationsDir, lang);
                const destPath = path.join(distTranslationsDir, lang);

                processPromises.push(
                    fs.readFile(filePath)
                        .then(fileContent => {
                            const json = JSON.parse(fileContent.toString());
                            langobj[langCode] = json.readableName || langCode;
                            copyPromises.push(fs.copyFile(sourcePath, destPath));
                        })
                        .catch(parseOrReadError => {
                            console.error(`Error processing ${filePath}:`, parseOrReadError);
                        })
                );
            }

            await Promise.all(processPromises);
            console.log(`Processed ${jsonFiles.length} translation JSON files.`);

            if (Object.keys(langobj).length > 0) {
                const langsJsPath = path.join(distTranslationsDir, 'langs.js');
                const langsJsContent = `const langs=${JSON.stringify(langobj)};\nexport { langs };`;
                await fs.writeFile(langsJsPath, langsJsContent);
                console.log(`Generated ${langsJsPath}`);
            } else {
                 console.log('No valid translation files found to generate langs.js.');
            }


            if (copyPromises.length > 0) {
                await Promise.all(copyPromises);
                console.log(`Copied ${copyPromises.length} translation JSON files to ${distTranslationsDir}`);
            }


        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`Translations directory ${translationsDir} not found, skipping.`);
            } else {
                console.error(`Error reading translations directory ${translationsDir}:`, err);
            }
        }


        const getUpdatesPath = path.join(distWebpageDir, 'getupdates');
        try {
            const { stdout } = await exec('git rev-parse HEAD');
            const revision = stdout.trim();
            await fs.writeFile(getUpdatesPath, revision);
            console.log(`Wrote git revision ${revision} to ${getUpdatesPath}`);
        } catch (error) {
            console.warn('Could not get git revision:', error.message);
            await fs.mkdir(path.dirname(getUpdatesPath), { recursive: true });
            await fs.writeFile(getUpdatesPath, 'unknown');
            console.log(`Wrote placeholder to ${getUpdatesPath}`);
        }

        console.log('Build extras finished successfully.');

    } catch (error) {
        console.error('Error during build extras:', error);
        throw error;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runBuildExtras().catch(err => {
        console.error("Build extras script failed when run directly:", err);
        process.exit(1);
    });
}