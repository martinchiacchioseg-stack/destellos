import bcrypt from "bcryptjs";

const clave = process.argv[2] || process.env.SUPERADMIN_INITIAL_PASSWORD || "Chiachio@1938";
const hash = bcrypt.hashSync(clave, 12);

console.log("\n========================================================");
console.log("DESTELLOS (by Rolφ) — Generador de Hash para Superadmin");
console.log("========================================================");
console.log(`Clave utilizada:   ${clave}`);
console.log(`Hash bcrypt (12):  ${hash}`);
console.log("\nCopiar este hash en tu archivo .env o en las variables de Vercel:");
console.log(`SUPERADMIN_PASSWORD_HASH=${hash}`);
console.log("========================================================\n");
