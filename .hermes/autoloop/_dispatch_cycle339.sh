cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

# Todo #133: Fix 6 remaining hardcoded strings
# thermal-metabolic.tsx line 387: "High"
# tongue-tie.tsx lines 590, 648: "Cancel"
# weaning-rash.tsx lines 148, 159, 210: "Window", "Rash", "Cancel"

STEP 1 — Check if i18n keys exist (add if missing)
node -e "
const fs=require('fs');
const en=JSON.parse(fs.readFileSync('app/i18n/en.json','utf8'));
const zh=JSON.parse(fs.readFileSync('app/i18n/zh.json','utf8'));
const keys={
  'en': {
    'thermalMetabolic.high':'High',
    'thermalMetabolic.low':'Low',
    'weaningRash.window':'Window',
    'weaningRash.rash':'Rash',
    'common.cancel':'Cancel'
  },
  'zh': {
    'thermalMetabolic.high':'高',
    'thermalMetabolic.low':'低',
    'weaningRash.window':'窗口',
    'weaningRash.rash':'皮疹',
    'common.cancel':'取消'
  }
};
Object.entries(keys.en).forEach(([k,v])=>{ if(!en[k]) en[k]=v; });
Object.entries(keys.zh).forEach(([k,v])=>{ if(!zh[k]) zh[k]=v; });
fs.writeFileSync('app/i18n/en.json',JSON.stringify(en,null,2)+'\n');
fs.writeFileSync('app/i18n/zh.json',JSON.stringify(zh,null,2)+'\n');
console.log('i18n keys added');
"

STEP 2 — Fix thermal-metabolic.tsx line 387
sed -i "s/<Text style={styles.curveAxisLabel}>High<\/Text>/<Text style={styles.curveAxisLabel}>{t('thermalMetabolic.high')}<\/Text>/" app/\(tabs\)/thermal-metabolic.tsx

STEP 3 — Fix weaning-rash.tsx lines 148, 159
sed -i "s/<Text style={styles.fieldLabel}>Window<\/Text>/<Text style={styles.fieldLabel}>{t('weaningRash.window')}<\/Text>/" app/\(tabs\)/weaning-rash.tsx
sed -i "s/<Text style={styles.fieldLabel}>Rash<\/Text>/<Text style={styles.fieldLabel}>{t('weaningRash.rash')}<\/Text>/" app/\(tabs\)/weaning-rash.tsx

STEP 4 — Fix weaning-rash.tsx Cancel button (line ~210)
sed -i "s/<Text style={styles.cancelBtnText}>Cancel<\/Text>/<Text style={styles.cancelBtnText}>{t('common.cancel')}<\/Text>/" app/\(tabs\)/weaning-rash.tsx

STEP 5 — Fix tongue-tie.tsx Cancel buttons (lines ~590, ~648)
sed -i "s/<Text style={styles.cancelBtnText}>Cancel<\/Text>/<Text style={styles.cancelBtnText}>{t('common.cancel')}<\/Text>/" app/\(tabs\)/tongue-tie.tsx

STEP 6 — Verify
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby && node scripts/pre-submission-audit.js 2>&1 | grep HardcodedStrings

DONE
ULW
