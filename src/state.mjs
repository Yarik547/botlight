import fs from "fs";

const STATE_FILE = "./state.json";

export function loadState() {
	let state = { chatId: null, lastHash: null, imageUrl: null };
	if (fs.existsSync(STATE_FILE)) {
		try {
			state = {
				...state,
				...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")),
			};
		} catch {}
	}
	return state;
}

export function saveState(state) {
	fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
