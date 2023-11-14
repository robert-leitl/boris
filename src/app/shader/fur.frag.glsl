uniform sampler2D furTexture;
uniform sampler2D normalMapTexture;

in vec3 vPosition;
in vec3 vWorldPosition;
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

float powFast(float a, float b) {
  return a / ((1. - b) * a + b);
}

void main(void) {
    vec4 color = vec4(1.);

    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 P = normalize(vPosition);
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 B = normalize(cross(T, N));
    vec3 L1 = normalize(vec3(0.2, 1., 0.1));
    vec3 L2 = normalize(vec3(-0.2, -1., -0.5));

    // apply normal mapping
    vec2 st = xyz2octahedron(N);
    vec3 pN1 = texture(normalMapTexture, st).xyz;
    N = mix(pN1, N, 0.);
    N = vNormalMatrix * N;

    // get the fur texture
    vec2 uv = vUv * vec2(2., 1.);
    vec4 fur = texture(furTexture, uv);

    // the alpha mask is defined by the shell layer index
    float alpha = smoothstep(max(0., vShellProgress - 0.5), vShellProgress, fur.r);

    // add two colored diffuse lights
    float diffuse1 = max(0., dot(L1, N)) * .8;
    float diffuse2 = max(0., dot(L2, N)) * .4;
    vec3 diffuseColor = diffuse1 * vec3(0.7, 0.6, 0.8) + diffuse2 * vec3(0.5, 0.45, 1.);
    diffuseColor = diffuseColor + vec3(0.02, 0.01, 0.04) * 1.5;

    // add fresnel color
    float fresnel = dot(V, N);
    vec3 fresnelColor = powFast(1. - fresnel, 10.) * vec3(0.3, 0.2, 0.4);

    // blend the fur brightness with the diffuse color
    color.rgb = diffuseColor * fur.r;

    // add frsnel on top
    color.rgb += fresnelColor * 1.1;

    color.rgb = clamp(color.rgb, vec3(0.), vec3(1.));

    color.a = alpha;
    outColor = color;
}
