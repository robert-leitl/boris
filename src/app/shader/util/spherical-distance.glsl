/**
 * Returns the distance between two points on a unit sphere.
 * Aussumes that the two vectors are normalized.
 */
float sphericalDistance(vec3 a, vec3 b) {
    return (acos(dot(b, a)));
}