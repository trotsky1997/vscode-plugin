package com.aixcoder.jdtls.extension.core.internal;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.Status;
import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

/**
 * The activator class controls the plug-in life cycle
 */
public class ExtensionActivator implements BundleActivator {

	// The plug-in ID
	public static final String PLUGIN_ID = "extension.core";
    private static BundleContext context;

	// The shared instance
	private static ExtensionActivator plugin;
	
	public void start(BundleContext bundleContext) throws Exception {
		plugin  = this;
		context = bundleContext;
		ExtensionActivator.logError("ExtensionActivator.start");
	}

	public void stop(BundleContext context) throws Exception {
		plugin = null;
	}

	/**
	 * Returns the shared instance
	 *
	 * @return the shared instance
	 */
	public static ExtensionActivator getDefault() {
		return plugin;
	}

    public static void log(IStatus status) {
        if (context != null) {
            Platform.getLog(context.getBundle()).log(status);
        }

    }

    public static void log(CoreException e) {
        log(e.getStatus());
    }

    public static void logError(String message) {
        if (context != null) {
            log((IStatus)(new Status(4, context.getBundle().getSymbolicName(), "AiXJava: " + message)));
        }

    }

    public static void logInfo(String message) {
        if (context != null) {
            log((IStatus)(new Status(1, context.getBundle().getSymbolicName(), "AiXJava: " + message)));
        }

    }

    public static void logException(String message, Throwable ex) {
        if (context != null) {
            log((IStatus)(new Status(4, context.getBundle().getSymbolicName(), "AiXJava: " + message, ex)));
        }

    }
}
