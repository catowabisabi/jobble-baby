#!/usr/bin/env python3
"""Fix: add constellation tab to _layout.tsx."""
import sys

# Fix _layout.tsx
layout_path = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/app/(tabs)/_layout.tsx'
with open(layout_path, 'r') as f:
    content = f.read()

if 'name="constellation"' in content:
    print('constellation already in _layout.tsx — no change needed')
else:
    # Find thermal-regulation screen block and add constellation after it
    # The thermal-regulation screen ends with a />  followed by whitespace then the next screen
    anchor = '        <Tabs.Screen\n          name="thermal-regulation"\n          options={{ title: t(\'tabs.thermalRegulation\'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="thermometer" size={size} color={color} /> }}\n        />'
    
    insert = '''        <Tabs.Screen
          name="constellation"
          options={{ title: t('tabs.constellation'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-star" size={size} color={color} /> }}
        />'''
    
    if anchor in content:
        content = content.replace(anchor, anchor + '\n' + insert)
        with open(layout_path, 'w') as f:
            f.write(content)
        print('Added constellation to _layout.tsx')
    else:
        print('ERROR: could not find thermal-regulation anchor in _layout.tsx')
        print('Searching for alternative anchor...')
        # Try simpler anchor
        alt = 'name="thermal-regulation"'
        if alt in content:
            print('Found thermal-regulation, trying alternative insertion method')
            # Find the line and insert after the closing of that screen block
            import re
            pattern = r'(<Tabs.Screen\n\s+name="thermal-regulation"[^/]*/>\n)'
            match = re.search(pattern, content)
            if match:
                start = match.end()
                content = content[:start] + '\n' + insert + content[start:]
                with open(layout_path, 'w') as f:
                    f.write(content)
                print('Added constellation (alt method) to _layout.tsx')
            else:
                sys.exit(1)
        else:
            sys.exit(1)

print('Done')