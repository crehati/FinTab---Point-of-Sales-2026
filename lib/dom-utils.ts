/**
 * Dynamically loads a script and waits for it to be ready.
 * Caches the script to avoid reloading.
 * @param src The URL of the script to load.
 * @param globalName The name of the global variable the script exports (e.g., 'html2canvas').
 * @returns A promise that resolves when the script is loaded.
 */
export const loadScript = (src: string, globalName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // If script is already available, resolve immediately
        if ((window as any)[globalName]) {
            return resolve();
        }
        
        const existingScript = document.querySelector(`script[src="${src}"]`);
        
        // If script is already being loaded by another component, just listen for its load event
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', (e) => reject(new Error(`Script load error for ${src}: ${e}`)));
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (e) => reject(new Error(`Script load error for ${src}: ${e}`));
        document.head.appendChild(script);
    });
};


/**
 * Dynamically loads a stylesheet.
 * Caches the stylesheet to avoid reloading.
 * @param href The URL of the stylesheet to load.
 * @returns A promise that resolves when the stylesheet is loaded.
 */
export const loadStyle = (href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // If stylesheet is already on the page, resolve immediately
        if (document.querySelector(`link[href="${href}"]`)) {
            return resolve();
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = (e) => reject(new Error(`Stylesheet load error for ${href}: ${e}`));
        document.head.appendChild(link);
    });
};
