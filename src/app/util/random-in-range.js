/**
 * Generates a random value between the given range
 * 
 * @param {number} min The minimum value of the random result
 * @param {number} max The maxium value of the random result
 * @returns 
 */
export function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}