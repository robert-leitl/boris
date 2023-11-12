// https://gamedev.stackexchange.com/questions/169508/octahedral-impostors-octahedral-mapping
vec3 octahedron2xyz(vec2 octahedron) {
    // Unpack the 0...1 range to the -1...1 unit square.
    vec3 position = vec3(octahedron * 2. - 1., 0);                

    // "Lift" the middle of the square to +1 z, and let it fall off linearly
    // to z = 0 along the Manhattan metric diamond (absolute.x + absolute.y == 1),
    // and to z = -1 at the corners where position.x and .y are both = +-1.
    vec2 absolute = abs(position.xy);
    position.z = 1. - absolute.x - absolute.y;

    // "Tuck in" the corners by reflecting the xy position along the line y = 1 - x
    // (in quadrant 1), and its mirrored image in the other quadrants.
    float posZ = step(0., position.z); // p.z < 0 --> 0, p.z >= 0 --> 1
    position.xy = mix(sign(position.xy) * vec2(1. - absolute.y, 1. - absolute.x), position.xy, posZ);

    return normalize(position);
}