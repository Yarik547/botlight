export function getEnv(name, { required = true, fallback = undefined } = {}) {
	const v = process.env[name];
	if (v && String(v).trim() !== "") return v;
	if (!required) return fallback;
	throw new Error(`Missing env var: ${name}`);
}

export function getEnvInt(
	name,
	{ required = true, fallback = undefined } = {},
) {
	const raw = process.env[name];
	if (raw && String(raw).trim() !== "") {
		const n = Number.parseInt(raw, 10);
		if (Number.isFinite(n)) return n;
		throw new Error(`Env var ${name} is not an int: ${raw}`);
	}
	if (!required) return fallback;
	throw new Error(`Missing env var: ${name}`);
}
