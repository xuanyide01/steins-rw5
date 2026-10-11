// The supplied walkthrough identifies these incoming messages as ending flags.
// Keywords stay in the original glyph encoding; no answers are auto-selected.
export const CRITICAL_MAIL_IDS=[297,301,304,308,316,324,335,341,344,354,377,381,386];
export const CRITICAL_REPLY_IDS=[299,303,306,312,318,329,336,342,346,362,378,383,387];
export function criticalMail(id){return CRITICAL_MAIL_IDS.indexOf(id)>=0;}
export function criticalPhone(source){return source==='SG08_12';}
export function criticalDmail(source){return source==='SG06_23'||source==='SG07_13';}
