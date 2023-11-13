uniform sampler2D particleTexture;
uniform int particleCount;
uniform float particleSize;

in vec2 vUv;

out float outHeight;

ivec2 ndx2tex(ivec2 dimensions, int index) {
    int y = index / dimensions.x;
    int x = index % dimensions.x;
    return ivec2(x, y);
}

#include "./util/octahedron2xyz.glsl"
#include "./util/spherical-distance.glsl"

void main() {
    ivec2 particleTexSize = textureSize(particleTexture, 0);

    vec3 pos = octahedron2xyz(vUv);
    float w = .9; // smoothing factor (the higher, the smoother)
    float res = 1.; // result height value

    // smooth voronoi (https://www.shadertoy.com/view/ldB3zc)
    for(int i=0; i<particleCount; i++) {
        vec4 p = texelFetch(particleTexture, ndx2tex(particleTexSize, i), 0);
        float d = sphericalDistance(normalize(p.xyz), pos) / (particleSize * 2.5);

        // do the smooth min 
        float h = smoothstep( -1., 1., (res - d) / w );

        // attenuate the distance by the size of the particle:
        // the bigger the size, the more weight for this distance
        h *= p.w;

        res = mix(res, d, h) - h * (1.0 - h) * (w / (1.0 + 3.0 * w));
    }

    // shape the height value
    res = smoothstep(0.35, 1., res);

    outHeight = 1. - res;
}