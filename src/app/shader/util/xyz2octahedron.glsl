vec2 xyz2octahedron(vec3 direction) {
    vec3 octant = sign(direction);

    // Scale the vector so |x| + |y| + |z| = 1 (surface of octahedron).
    float sum = dot(direction, octant);        
    vec3 octahedron = direction / sum;    

    // "Untuck" the corners using the same reflection across the diagonal as before.
    // (A reflection is its own inverse transformation).
    vec3 absolute = abs(octahedron);
    float posZ = step(0., octahedron.z); // p.z < 0 --> 0, p.z >= 0 --> 1
    octahedron.xy = mix(octant.xy * vec2(1. - absolute.y, 1. - absolute.x), octahedron.xy, posZ);

    return octahedron.xy * 0.5 + 0.5;
}

/**
 * This octahedron mapping function tries to prevent any 
 * visible seams at the back of the octahedron by offsetting
 * the directions on the seam a little bit (eps = 0.001).
 */
vec2 xyz2octahedron(vec3 direction, float eps) {
    vec3 dir = direction;
    
    vec2 safeOffset = vec2(
        mix(eps, 0., step(eps, abs(dir.x))),
        mix(eps, 0., step(eps, abs(dir.y)))
    );
    dir.xy += mix(safeOffset, vec2(0.), step(0., dir.z));

    vec3 octant = sign(dir);

    // Scale the vector so |x| + |y| + |z| = 1 (surface of octahedron).
    float sum = dot(dir, octant);        
    vec3 octahedron = dir / sum;    

    // "Untuck" the corners using the same reflection across the diagonal as before.
    // (A reflection is its own inverse transformation).
    vec3 absolute = abs(octahedron);
    float posZ = step(0., octahedron.z); // p.z < 0 --> 0, p.z >= 0 --> 1
    octahedron.xy = mix(octant.xy * vec2(1. - absolute.y, 1. - absolute.x), octahedron.xy, posZ);

    return octahedron.xy * 0.5 + 0.5;
}