import "server-only";
import { randomInt } from "crypto";

const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Clave temporal legible (sin caracteres ambiguos). */
export const claveTemporal = () => Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
