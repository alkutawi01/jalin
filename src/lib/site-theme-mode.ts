/**
 * The look of the public site: Cerah, Sepia, Gelap, or "sistem" (follow the device). One resolver, used by the script that runs before the
 * first paint, by ThemeSync and by the account page, so the three can never disagree.
 *
 * Where the choice lives:
 *  - "jalin-tema"        a choice made on this device (including "sistem"); it wins.
 *  - "jalin-tema-akaun"  the theme saved in the signed-in reader's account, cached so the first paint is already right; removed for a visitor.
 *  - neither             "sistem": a visitor follows the device. The saved account theme is never rewritten to match the device.
 * The admin keeps its own look and is never themed (it has no dark mode).
 */
export type ThemeChoice = "cerah" | "sepia" | "gelap" | "sistem";
export type ThemeName = "cerah" | "sepia" | "gelap";

export const THEME_KEY = "jalin-tema";
export const ACCOUNT_THEME_KEY = "jalin-tema-akaun";

/** The browser's own bar takes the page colour. */
export const THEME_BAR_COLOURS: Record<ThemeName, string> = { cerah: "#fbf8f2", sepia: "#f1e4cc", gelap: "#101e22" };

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "cerah" || value === "sepia" || value === "gelap" || value === "sistem";
}

export function resolveTheme(choice: ThemeChoice, deviceIsDark: boolean): ThemeName {
  return choice === "sistem" ? (deviceIsDark ? "gelap" : "cerah") : choice;
}

/** The choice in force: this device's own, else the account's cached one, else follow the device. */
export function chosenTheme(local: string | null, account: string | null): ThemeChoice {
  if (isThemeChoice(local)) return local;
  if (account === "cerah" || account === "sepia" || account === "gelap") return account;
  return "sistem";
}

/** Runs in <head> before the first paint (no flash of the wrong theme). Plain ES5, kept in step with the functions above by a test. */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;if(location.pathname.indexOf('/admin')===0)return;var l=localStorage.getItem('${THEME_KEY}'),a=localStorage.getItem('${ACCOUNT_THEME_KEY}');var c=(l==='cerah'||l==='sepia'||l==='gelap'||l==='sistem')?l:((a==='cerah'||a==='sepia'||a==='gelap')?a:'sistem');var t=c==='sistem'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'gelap':'cerah'):c;d.setAttribute('data-theme',t);d.setAttribute('data-theme-choice',c);var bar={cerah:'${THEME_BAR_COLOURS.cerah}',sepia:'${THEME_BAR_COLOURS.sepia}',gelap:'${THEME_BAR_COLOURS.gelap}'};var m=document.querySelectorAll('meta[name=theme-color]');for(var i=0;i<m.length;i++){m[i].setAttribute('content',bar[t]);m[i].removeAttribute('media');}}catch(e){}})();`;
