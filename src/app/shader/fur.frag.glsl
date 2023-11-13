uniform sampler2D furTexture;
uniform sampler2D normalMapTexture;

in vec3 vPosition;
in vec3 vNormal;
in vec3 vTangent;
in vec2 vUv;
in float vShellProgress;
in mat3 vNormalMatrix;
in float vDisplace;

layout(location=0) out vec4 outColor;

#include "./util/constants/pi.glsl";
#include "./util/xyz2octahedron.glsl";
#include "./util/xyz2equirect.glsl";

void main(void) {
    vec4 color = vec4(1.);

    vec3 P = normalize(vPosition);
    vec3 L1 = vec3(0., 1., 0.1);
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 B = normalize(cross(T, N));

    // apply normal mapping
    vec2 st = xyz2octahedron(N);
    vec3 pN1 = texture(normalMapTexture, st).xyz;
    N = mix(pN1, N, 0.);
    N = vNormalMatrix * N;


    vec2 uv = vUv * vec2(2., 1.);
    vec4 fur = texture(furTexture, uv);
    float alpha = smoothstep(max(0., vShellProgress - 0.5), vShellProgress, fur.r);

    float diffuse = dot(L1, N);

    color = fur * diffuse;
    color.a = alpha;

    outColor = color;
}
