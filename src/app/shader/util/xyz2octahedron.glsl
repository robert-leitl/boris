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