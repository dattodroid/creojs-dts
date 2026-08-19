/** -------------- Creo.JS - Misc ----------------*/

/** Prints a given message to the current browser window */
declare function print(message?: any): void

/** -------------- Creo.JS - Including External Scripts ----------------*/

interface NodeRequire {
    (id: string): any;
}
declare const require: NodeRequire

/** Returns an array of folders where require is looking for a required script.
 * The script path is to be set in the creo_js_app.conf file by setting js_path property */
declare function getScriptPath(): string[]

/** Removes the required file from cache. That is, consecutive call of <b>require</b> results in reloading and re-executing the requied script. */
declare function forgetRequired (moduleName: string): void

/** Removes all cached required scripts */
declare function forgetAllRequired(): void

declare function getRegisteredModules(): string[]

/** -------------- Creo.JS - Accessing Scripts Local Location ----------------*/

/** Returns the full path of the directory JavaScript scripts located in */
declare function getScriptFolder(): string

/** Returns a string containing a list of all scripts names from getScriptFolder() separated by commas.
 * Script names are the relative names to getScriptFolder(). */
declare function getScriptsList(): string

/** Returns an array of all script names from getScriptFolder(). */
declare function getScripts(): string[]

/** -------------- Creo.JS - Web server ----------------*/

/** -------------- Creo.JS - Uploading or Downloading Data to and from the Web server ----------------*/

/** -------------- Creo.JS - Managing Session Data ----------------*/

/** -------------- Creo.JS - Managing User Application Data ----------------*/

/** -------------- Creo.JS - Reading and Writing files ----------------*/
