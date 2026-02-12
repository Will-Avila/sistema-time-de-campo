import { toast as sonnerToast } from "sonner";

type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Bridge function to provide a simple toast interface while using sonner under the hood.
 * This ensures compatibility with existing code while using a robust notification system.
 */
export function toast(message: string, type: ToastType = 'info') {
    switch (type) {
        case 'success':
            sonnerToast.success(message);
            break;
        case 'error':
            sonnerToast.error(message);
            break;
        case 'warning':
            sonnerToast.warning(message);
            break;
        case 'info':
        default:
            sonnerToast.info(message);
            break;
    }
}

/**
 * @deprecated The custom ToastContainer is no longer needed as we use Sonner's Toaster in RootLayout.
 * Keeping a dummy component to avoid breaking imports if any.
 */
export function ToastContainer() {
    return null;
}
