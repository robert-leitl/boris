uniform sampler2D furTexture;

in vec2 vUv;
in float vShellProgress;

void main(void) {
    vec4 color = vec4(1.);
    vec2 uv = fract(vUv * vec2(2., 1.));

    vec4 fur = texture(furTexture, uv);
    float alpha = smoothstep(max(0., vShellProgress - 0.5), vShellProgress, fur.r);

    color = fur * vec4(1., 0.6, 0.5, 0.);
    color.a = alpha;

    csm_DiffuseColor = color;
}
