vec3 equirect2xyz(vec2 uv) {
    float Phi = PI - uv.y * PI;
    float Theta = uv.x * PI * 2.;
    vec3 dir = vec3(cos(Theta), 0.0, sin(Theta));
    dir.y   = cos(Phi);
    dir.xz *= sqrt(1.0 - dir.y * dir.y);
    return dir;
}