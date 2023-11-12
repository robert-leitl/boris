uniform sampler2D particleTexture;
uniform int particleCount;

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
    float w = .5; // smoothing factor (the higher, the smoother)
    float res = 1.; // result height value
    float weight = 1.; 

    // smooth voronoi (https://www.shadertoy.com/view/ldB3zc)
    int closestParticleId;
    for(int i=0; i<particleCount; i++) {
        vec4 p = texelFetch(particleTexture, ndx2tex(particleTexSize, i), 0);
        float d = sphericalDistance(normalize(p.xyz), pos) / 0.52;

        float nw = mix(1., d, p.w);

        // do the smooth min 
        float h = smoothstep( -1., 1., (weight - nw) / w );
        weight = mix(weight, nw, h) - h * (1.0 - h) * (w / (1.0 + 3.0 * w));

        if (res > d) {
            closestParticleId = i;
            res = d;
        }
    }

    vec4 closestParticle = texelFetch(particleTexture, ndx2tex(particleTexSize, closestParticleId), 0);

    // apply height factor
    res = 1. - res;

    outHeight = 1. - (cos(weight * 20.) * (1. - weight));
}