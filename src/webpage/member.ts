import {User} from "./user.js";
import type {Role} from "./role.js";
import type {Guild} from "./guild.js";
import {SnowFlake} from "./snowflake.js";
import type {memberjson, presencejson} from "./jsontypes.js";
import {I18n} from "./i18n.js";
import {Dialog, type Options, Settings} from "./settings.js";

class Member extends SnowFlake {
	static already = {};
	owner: Guild;
	user: User;
	roles: Role[] = [];
	nick!: string;
	avatar: undefined | string = undefined;
	banner: undefined | string = undefined;
	private constructor(memberjson: memberjson, owner: Guild) {
		super(memberjson.id);
		this.owner = owner;
		if (this.localuser.userMap.has(memberjson.id)) {
			this.user = this.localuser.userMap.get(memberjson.id) as User;
		} else if (memberjson.user) {
			this.user = new User(memberjson.user, owner.localuser);
		} else {
			throw new Error("Missing user object of this member");
		}
		if (this.localuser.userMap.has(this?.id)) {
			this.user = this.localuser.userMap.get(this?.id) as User;
		}
		this.update(memberjson);
	}
	remove() {
		this.user.members.delete(this.guild);
		this.guild.members.delete(this);
	}
	getpfpsrc(): string {
		if (this.hypotheticalpfp && this.avatar) {
			return this.avatar;
		}
		if (this.avatar !== undefined && this.avatar !== null) {
			return `${this.info.cdn}/guilds/${this.guild.id}/users/${this.id}/avatars${
				this.avatar
			}.${this.avatar.startsWith("a_") ? "gif" : "png"}`;
		}
		return this.user.getpfpsrc();
	}
	getBannerUrl(): string | undefined {
		if (this.hypotheticalbanner && this.banner) {
			return this.banner;
		}
		if (this.banner) {
			return `${this.info.cdn}/banners/${this.guild.id}/${
				this.banner
			}.${this.banner.startsWith("a_") ? "gif" : "png"}`;
		}
			return undefined;
	}
	joined_at!: string;
	premium_since!: string;
	deaf!: boolean;
	mute!: boolean;
	pending!: boolean;
	clone() {
		return new Member(
			{
				id: `${this.id}#clone`,
				user: this.user.tojson(),
				guild_id: this.guild.id,
				guild: {id: this.guild.id},
				avatar: this.avatar as string | undefined,
				banner: this.banner as string | undefined,
				//TODO presence
				nick: this.nick,
				roles: this.roles.map((_) => _.id),
				joined_at: this.joined_at,
				premium_since: this.premium_since,
				deaf: this.deaf,
				mute: this.mute,
				pending: this.pending,
			},
			this.owner,
		);
	}
	pronouns?: string;
	bio?: string;
	hypotheticalpfp = false;
	hypotheticalbanner = false;
	accent_color?: number;
	get headers() {
		return this.owner.headers;
	}

	updatepfp(file: Blob): void {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			fetch(`${this.info.api}/guilds/${this.guild.id}/members/${this.id}/`, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					avatar: reader.result,
				}),
			});
		};
	}
	updatebanner(file: Blob | null): void {
		if (file) {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				fetch(`${this.info.api}/guilds/${this.guild.id}/profile/${this.id}`, {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						banner: reader.result,
					}),
				});
			};
		} else {
			fetch(`${this.info.api}/guilds/${this.guild.id}/profile/${this.id}`, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					banner: null,
				}),
			});
		}
	}

	updateProfile(json: {bio?: string | null; pronouns?: string | null; nick?: string | null}) {
		console.log(JSON.stringify(json));
		/*
		if(json.bio===""){
			json.bio=null;
		}
		if(json.pronouns===""){
			json.pronouns=null;
		}
		if(json.nick===""){
			json.nick=null;
		}
		*/
		fetch(`${this.info.api}/guilds/${this.guild.id}/profile/${this.id}`, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json),
		});
	}
	showEditProfile() {
		const settings = new Settings("");
		this.editProfile(
			settings.addButton(I18n.getTranslation("user.editServerProfile"), {ltr: true}),
		);
		settings.show();
	}
	editProfile(options: Options) {
		if (this.hasPermission("CHANGE_NICKNAME")) {
			const hypotheticalProfile = document.createElement("div");
			let file: undefined | File | null;
			let newpronouns: string | undefined;
			let newbio: string | undefined;
			let nick: string | undefined;
			const hypomember = this.clone();

			let color: string;
			async function regen() {
				hypotheticalProfile.textContent = "";
				const hypoprofile = await hypomember.user.buildprofile(-1, -1, hypomember);

				hypotheticalProfile.appendChild(hypoprofile);
			}
			regen();
			const settingsLeft = options.addOptions("");
			const settingsRight = options.addOptions("");
			settingsRight.addHTMLArea(hypotheticalProfile);

			const nicky = settingsLeft.addTextInput(I18n.getTranslation("member.nick:"), () => {}, {
				initText: this.nick || "",
			});
			nicky.watchForChange((_) => {
				hypomember.nick = _;
				nick = _;
				regen();
			});

			const finput = settingsLeft.addFileInput(
				I18n.getTranslation("uploadPfp"),
				(_) => {
					if (file) {
						this.updatepfp(file);
					}
				},
				{clear: true},
			);
			finput.watchForChange((_) => {
				if (!_) {
					file = null;
					hypomember.avatar = undefined;
					hypomember.hypotheticalpfp = true;
					regen();
					return;
				}
				if (_.length) {
					file = _[0];
					const blob = URL.createObjectURL(file);
					hypomember.avatar = blob;
					hypomember.hypotheticalpfp = true;
					regen();
				}
			});
			let bfile: undefined | File | null;
			const binput = settingsLeft.addFileInput(
				I18n.getTranslation("uploadBanner"),
				(_) => {
					if (bfile !== undefined) {
						this.updatebanner(bfile);
					}
				},
				{clear: true},
			);
			binput.watchForChange((_) => {
				if (!_) {
					bfile = null;
					hypomember.banner = undefined;
					hypomember.hypotheticalbanner = true;
					regen();
					return;
				}
				if (_.length) {
					bfile = _[0];
					const blob = URL.createObjectURL(bfile);
					hypomember.banner = blob;
					hypomember.hypotheticalbanner = true;
					regen();
				}
			});
			let changed = false;
			const pronounbox = settingsLeft.addTextInput(
				I18n.getTranslation("pronouns"),
				(_) => {
					if (newpronouns !== undefined || newbio !== undefined || changed !== undefined) {
						this.updateProfile({
							pronouns: newpronouns,
							bio: newbio,
							//accent_color: Number.parseInt("0x" + color.substr(1), 16),
							nick,
						});
					}
				},
				{initText: this.pronouns},
			);
			pronounbox.watchForChange((_) => {
				hypomember.pronouns = _;
				newpronouns = _;
				regen();
			});
			const bioBox = settingsLeft.addMDInput(I18n.getTranslation("bio"), (_) => {}, {
				initText: this.bio,
			});
			bioBox.watchForChange((_) => {
				newbio = _;
				hypomember.bio = _;
				regen();
			});
			color = (this.accent_color ? `#${this.accent_color.toString(16)}` : "transparent") as string;

			const colorPicker = settingsLeft.addColorInput(
				I18n.getTranslation("profileColor"),
				(_) => {},
				{initColor: color},
			);
			colorPicker.watchForChange((_) => {
				console.log();
				color = _;
				hypomember.accent_color = Number.parseInt(`0x${_.substring(1)}`);
				changed = true;
				regen();
			});
		}
	}
	update(memberjson: memberjson) {
		if (memberjson.roles) {
			this.roles = [];
		}
		for (const key of Object.keys(memberjson)) {
			if (key === "guild" || key === "owner" || key === "user") {
				continue;
			}

			if (key === "roles") {
				for (const strrole of memberjson.roles) {
					const role = this.guild.roleids.get(strrole);
					if (!role) continue;
					this.roles.push(role);
				}
				if (!this.user.bot) {
					const everyone = this.guild.roleids.get(this.guild.id);
					if (everyone && this.roles.indexOf(everyone) === -1) {
						this.roles.push(everyone);
					}
				}
				continue;
			}
			if (key === "presence") {
				this.getPresence(memberjson.presence);
				continue;
			}
			(this as any)[key] = (memberjson as any)[key];
		}

		const everyone = this.guild.roleids.get(this.guild.id);
		if (everyone && this.roles.indexOf(everyone) === -1) {
			this.roles.push(everyone);
		}

		this.roles.sort((a, b) => {
			return this.guild.roles.indexOf(a) - this.guild.roles.indexOf(b);
		});
	}
	get guild() {
		return this.owner;
	}
	get localuser() {
		return this.guild.localuser;
	}
	get info() {
		return this.owner.info;
	}
	static async new(memberjson: memberjson, owner: Guild): Promise<Member | undefined> {
		let user: User;
		if (owner.localuser.userMap.has(memberjson.id)) {
			if (memberjson.user) {
				new User(memberjson.user, owner.localuser);
			}
			user = owner.localuser.userMap.get(memberjson.id) as User;
		} else if (memberjson.user) {
			user = new User(memberjson.user, owner.localuser);
		} else {
			throw new Error("missing user object of this member");
		}
		if (user.members.has(owner)) {
			let memb = user.members.get(owner);
			if (memb === undefined) {
				memb = new Member(memberjson, owner);
				user.members.set(owner, memb);
				owner.members.add(memb);
				return memb;
			}if (memb instanceof Promise) {
				const member = await memb; //I should do something else, though for now this is "good enough";
				if (member) {
					member.update(memberjson);
				}
				return member;
			}
				if (memberjson.presence) {
					memb.getPresence(memberjson.presence);
				}
				memb.update(memberjson);
				return memb;
		}
			const memb = new Member(memberjson, owner);
			user.members.set(owner, memb);
			owner.members.add(memb);
			return memb;
	}
	compare(str: string) {
		function similar(str2: string | null | undefined) {
			if (!str2) return 0;
			const strl = Math.max(str.length, 1);
			if (str2.includes(str)) {
				return strl / str2.length;
			}if (str2.toLowerCase().includes(str.toLowerCase())) {
				return strl / str2.length / 1.2;
			}
			return 0;
		}
		return Math.max(
			similar(this.user.name),
			similar(this.user.nickname),
			similar(this.nick),
			similar(this.user.username),
			similar(this.id) / 1.5,
		);
	}
	static async resolveMember(user: User, guild: Guild): Promise<Member | undefined> {
		if (user.webhook) return undefined;
		const maybe = user.members.get(guild);
		if (!user.members.has(guild)) {
			const membpromise = guild.localuser.resolvemember(user.id, guild.id);
			const promise = new Promise<Member | undefined>(async (res) => {
				const membjson = await membpromise;
				if (membjson === undefined) {
					return res(undefined);
				}
					const member = new Member(membjson, guild);
					const map = guild.localuser.presences;
					member.getPresence(map.get(member.id));
					map.delete(member.id);
					res(member);
					return member;
			});
			user.members.set(guild, promise);
			const member = await promise;
			if (member) {
				guild.members.add(member);
			}
			user.members.set(guild, member);
			return member;
		}
		if (maybe instanceof Promise) {
			return await maybe;
		}
			return maybe;
	}
	public getPresence(presence: presencejson | undefined) {
		this.user.getPresence(presence);
	}
	/**
	 * @todo
	 */
	highInfo() {
		fetch(
			`${this.info.api}/users/${this.id}/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=${this.guild.id}`,
			{headers: this.guild.headers},
		);
	}
	hasRole(ID: string) {
		for (const thing of this.roles) {
			if (thing.id === ID) {
				return true;
			}
		}
		return false;
	}
	getColor() {
		if (!this.localuser.perminfo.user.disableColors) {
			return "";
		}
		for (const thing of this.roles) {
			const color = thing.getColor();
			if (color) {
				return color;
			}
		}
		return "";
	}
	isAdmin() {
		for (const role of this.roles) {
			if (role.permissions.getPermission("ADMINISTRATOR")) {
				return true;
			}
		}
		return this.guild.properties.owner_id === this.user.id;
	}
	bind(html: HTMLElement) {
		if (html.tagName === "SPAN") {
			if (!this) {
				return;
			}
			/*
				if(this.error){

				}
				*/
			html.style.color = this.getColor();
		}

		//this.profileclick(html);
	}
	profileclick(/* html: HTMLElement */) {
		//to be implemented
	}
	get name() {
		return this.nick || this.user.username;
	}
	kick() {
		const menu = new Dialog("");
		const form = menu.options.addForm("", (e: any) => {
			this.kickAPI(e.reason);
			menu.hide();
		});
		form.addTitle(I18n.getTranslation("member.kick", this.name, this.guild.properties.name));
		form.addTextInput(I18n.getTranslation("member.reason:"), "reason");
		menu.show();
	}
	kickAPI(reason: string) {
		const headers = structuredClone(this.guild.headers);
		(headers as any)["x-audit-log-reason"] = reason;
		fetch(`${this.info.api}/guilds/${this.guild.id}/members/${this.id}`, {
			method: "DELETE",
			headers,
		});
	}
	ban() {
		const menu = new Dialog("");
		const form = menu.options.addForm("", (e: any) => {
			this.banAPI(e.reason);
			menu.hide();
		});
		form.addTitle(I18n.getTranslation("member.ban", this.name, this.guild.properties.name));
		form.addTextInput(I18n.getTranslation("member.reason:"), "reason");
		menu.show();
	}
	addRole(role: Role) {
		const roles = this.roles.map((_) => _.id);
		roles.push(role.id);
		fetch(`${this.info.api}/guilds/${this.guild.id}/members/${this.id}`, {
			method: "PATCH",
			headers: this.guild.headers,
			body: JSON.stringify({roles}),
		});
	}
	removeRole(role: Role) {
		let roles = this.roles.map((_) => _.id);
		roles = roles.filter((_) => _ !== role.id);
		fetch(`${this.info.api}/guilds/${this.guild.id}/members/${this.id}`, {
			method: "PATCH",
			headers: this.guild.headers,
			body: JSON.stringify({roles}),
		});
	}
	banAPI(reason: string) {
		const headers = structuredClone(this.guild.headers);
		(headers as any)["x-audit-log-reason"] = reason;
		fetch(`${this.info.api}/guilds/${this.guild.id}/bans/${this.id}`, {
			method: "PUT",
			headers,
		});
	}
	hasPermission(name: string): boolean {
		if (this.isAdmin()) {
			return true;
		}
		for (const thing of this.roles) {
			if (thing.permissions.getPermission(name)) {
				return true;
			}
		}
		return false;
	}
}
export {Member};
