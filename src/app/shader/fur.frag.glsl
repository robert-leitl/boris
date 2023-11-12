uniform sampler2D furTexture;
uniform sampler2D heightMapTexture;

in vec3 vPosition;
in vec2 vUv;
in float vShellProgress;

#include "./util/xyz2octahedron.glsl";

void main(void) {
    vec4 color = vec4(1.);
    vec2 uv = fract(vUv * vec2(2., 1.));

    vec2 o = xyz2octahedron(normalize(vPosition));
    vec4 h = texture(heightMapTexture, o);

    vec4 fur = texture(furTexture, uv);
    float alpha = smoothstep(max(0., vShellProgress - 0.5), vShellProgress, fur.r);

    color = fur * vec4(1., 0.6, 0.5, 0.) * h.r;
    color.a = alpha;

    csm_DiffuseColor = color;
}
