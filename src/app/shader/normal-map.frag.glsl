uniform sampler2D heightMapTexture;

in vec2 vUv;

out vec4 outData;

#include "./util/octahedron2xyz.glsl"
#include "./util/xyz2octahedron.glsl"
#include "./util/orthogonal.glsl"

void main() {
    vec2 texelSize = 1. / vec2(textureSize(heightMapTexture, 0));
    float epsilon = 0.01;
    float h = texture(heightMapTexture, vUv).r;
    vec3 N = octahedron2xyz(vUv);

    vec3 T = orthogonal(N);
    vec3 B = cross(N, T);
    float s = 6.; // artificial strength

    vec2 o1 = xyz2octahedron(normalize(N + T * epsilon));
    float h1 = texture(heightMapTexture, o1).r;
    T += N * (h1 - h) * s;
    T = normalize(T);

    vec2 o2 = xyz2octahedron(normalize(N + B * epsilon));
    float h2 = texture(heightMapTexture, o2).r;
    B += N * (h2 - h) * s;
    B = normalize(B);

    N = cross(T, B);

    outData = vec4(N, h);
}