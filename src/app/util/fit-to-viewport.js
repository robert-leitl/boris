/**
 * Sets the distance, near and far plane of the camera according to the sphere radius
 * at the origin. It is assumed that the camera looks at the origin.
 *
 * @param radius
 * @param camera
 * @param sizePaddingFactor Padding around the object relative to the radius of the sphere
 * @param nearPlanePaddingFactor The near plane relative to the front of the sphere
 * @param farPlanePaddingFactor The far plane relative to the back of the sphere
 */
export function fitSphereAtOriginToViewport(radius, camera, sizePaddingFactor = 0, nearPlanePaddingFactor = 0, farPlanePaddingFactor = 0) {
    const r = radius * (1 + sizePaddingFactor);
    const fov = Math.PI * camera.fov / 360;
    if (camera.aspect >= 1) {
        camera.position.z = r / Math.sin(fov);
    } else {
        camera.position.z = r / (camera.aspect * Math.sin(fov));
    }
    camera.near = (camera.position.z - r) - r * nearPlanePaddingFactor;
    camera.far = (camera.position.z + r)  + r * farPlanePaddingFactor;
}
