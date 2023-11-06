export function resizeRendererToDisplaySize(renderer, overridePixelRatio) {
    const canvas = renderer.domElement;
    const pixelRatio = overridePixelRatio !== undefined ? overridePixelRatio : Math.round(Math.min(1, window.devicePixelRatio));
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}
