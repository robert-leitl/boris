uniform sampler2D particleTexture;

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
    int particleCount = particleTexSize.x * particleTexSize.y;

    vec3 pos = octahedron2xyz(vUv);
    float w = 0.; // smoothing factor (the higher, the smoother)
    float res = 1.; // result height value

    // smooth voronoi (https://www.shadertoy.com/view/ldB3zc)
    for(int i=0; i<particleCount; i++) {
        vec4 p = texelFetch(particleTexture, ndx2tex(particleTexSize, i), 0);
        float d = sphericalDistance(normalize(p.xyz), pos);

        // do the smooth min 
        //float h = smoothstep( -1., 1., (res - d) / w );
        //res = mix(res, d, h) - h * (1.0 - h) * (w / (1.0 + 3.0 * w));
        res = min(res, d);
    }

    res = smoothstep(0., 0.2, res);

    // apply height factor
    res = (1. - res);

    outHeight = res;
}