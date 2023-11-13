uniform sampler2D envTexture;

in vec3 vNormal;
in vec3 vWorldPosition;
flat in vec3 vFlatNormal;

layout(location=0) out vec4 outColor;

#include "./util/constants/pi.glsl"
#include "./util/xyz2equirect.glsl"

float powFast(float a, float b) {
  return a / ((1. - b) * a + b);
}

void main(void) {
    vec4 color = vec4(0., 0., 0., 1.);

    vec3 N = normalize(vNormal);
    vec3 flatN = normalize(vFlatNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 R = reflect(V, N);
    vec3 L1 = vec3(0.2, 2., 3.); // spot light 1
    vec3 L2 = vec3(-0.2, -2., 1.) * 1000.; // spot light 2

    float fresnel = dot(V, N);

    // spot light specular reflection
    float specular1 = powFast(dot(N, normalize(L1 - vWorldPosition)), 800.);
    float specular2 = powFast(dot(N, normalize(L2 - vWorldPosition)), 20.);
    specular2 = smoothstep(0.2, .4, specular2);

    // add specular color
    color.rgb += vec3(1., 0.9, 1.) * specular1 * 1.5;

    // add inner glow
    color.rgb += powFast(fresnel, 20.) * vec3(0.1, 0.12, 0.15) * 0.8;

    // attenuate color for the bottom eyes
    color.rgb *= (1. - abs(vWorldPosition.y) * step(0., -vWorldPosition.y));


    color.rgb += vec3(1., 0.9, 2.5) * specular2 * .02;
    
    // add fresnel rim light
    color.rgb += powFast(1. - fresnel, 4.) * vec3(0.2, 0.1, 0.4);

    outColor = color;
}
