#!/usr/bin/env python3
"""Add accessibilityLabel to all TSX tab files that don't have them yet."""
import os
import re

TAB_DIR = '(tabs)'

files = sorted(os.listdir(TAB_DIR))
files = [f for f in files if f.endswith('.tsx') and f != 'index.tsx']  # skip index.tsx (done)

total_added = 0
for fname in files:
    path = os.path.join(TAB_DIR, fname)
    with open(path) as f:
        content = f.read()
    
    original = content
    tab_name = fname.replace('.tsx', '')
    
    # Find all TouchableOpacity/Pressable/Button that don't have accessibilityLabel
    # Strategy: go line by line
    lines = content.split('\n')
    new_lines = []
    i = 0
    added_this_file = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a TouchableOpacity/Pressable/Button
        m = re.match(r'^(\s*)<(TouchableOpacity|Pressable|Button)(\b.*)$', line)
        if m:
            indent = m.group(1)
            tag = m.group(2)
            rest = m.group(3)
            
            # Check if this tag already has accessibilityLabel on this line or next
            has_label = 'accessibilityLabel=' in rest
            next_line_has_label = (i+1 < len(lines) and 'accessibilityLabel=' in lines[i+1])
            
            if has_label or next_line_has_label:
                new_lines.append(line)
                i += 1
                continue
            
            # Insert accessibilityLabel on the next line (properly indented)
            new_lines.append(line)
            
            # Determine next non-empty line to check context
            context_lines = []
            j = i + 1
            while j < len(lines) and j < i + 10:
                if lines[j].strip():
                    context_lines.append(lines[j].strip())
                    break
                j += 1
            
            # Generate label based on context
            label = f"{tag} button"
            
            # Try to find a more specific label from context
            context = ' '.join(context_lines)
            if 'onPress' in rest or 'onPress' in context:
                if 'setShow' in rest or 'setShow' in context:
                    label = f"Toggle {tab_name} panel"
                elif 'stop' in rest.lower() or 'stop' in context.lower():
                    label = f"Stop {tab_name} timer"
                elif 'start' in rest.lower() or 'start' in context.lower():
                    label = f"Start {tab_name} timer"
                elif 'add' in rest.lower() or 'add' in context.lower():
                    label = f"Add {tab_name} entry"
                elif 'cancel' in rest.lower() or 'cancel' in context.lower():
                    label = f"Cancel {tab_name} action"
                elif 'save' in rest.lower() or 'save' in context.lower():
                    label = f"Save {tab_name} entry"
                elif 'close' in rest.lower() or 'close' in context.lower():
                    label = f"Close {tab_name}"
                elif 'navigate' in rest.lower() or 'router' in rest.lower():
                    label = f"Navigate in {tab_name}"
                else:
                    label = f"{tag} in {tab_name}"
            else:
                label = f"{tag} in {tab_name}"
            
            # Insert the accessibilityLabel line
            label_indent = indent + '                '
            new_lines.append(f'{label_indent}accessibilityLabel="{label}"')
            added_this_file += 1
            i += 1
            continue
        else:
            new_lines.append(line)
        i += 1
    
    result = '\n'.join(new_lines)
    
    if result != original:
        with open(path, 'w') as f:
            f.write(result)
        print(f"  {fname}: +{added_this_file} labels")
    else:
        print(f"  {fname}: no changes")
    total_added += added_this_file

print(f"\nTotal labels added: {total_added}")