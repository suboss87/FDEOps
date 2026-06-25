# scripts/demo.tape
# fdeops v3 - discover does the work, memory writes itself
# Generate with: vhs scripts/demo.tape

Output media/demo.gif

Set FontSize 16
Set Width 1100
Set Height 640
Set Theme "Dracula"
Set TypingSpeed 22ms

Type "$ claude"
Enter
Sleep 800ms

Type "> @fde I'm on site at Meridian. Brief says 'fix the slow shipping-rates API.'"
Enter
Sleep 2s

Type "  reading ~/fde-engagements/meridian/.fde/context.md ... new engagement"
Enter
Type "  routing -> discover"
Enter
Sleep 1500ms

Type "  terrain scan:"
Enter
Type "    churn (90d):   rates/quote.js - 47 commits, no test neighbors"
Enter
Type "    'temporary':   rates/batch_workaround.js - 'remove after Q3 2022'"
Enter
Sleep 2s

Type "  The brief says speed. The repo says batch pricing was never built -"
Enter
Type "  ask ops how they cope today. If a spreadsheet shows up, the brief is wrong."
Enter
Sleep 2.5s

Type "  -> wrote reality.md   (real problem vs brief, with evidence)"
Enter
Type "  -> wrote terrain.md   (3 hotspots, handle-with-care list)"
Enter
Sleep 2s

Type "> [next morning] @fde"
Enter
Sleep 1200ms

Type "  Last session you confirmed the batch-pricing gap and flagged rates/quote.js."
Enter
Type "  Next step in context.md: sponsor readout. Want the one-pager?"
Enter
Sleep 3s

Type "clear"
Enter
Sleep 400ms

Type "echo 'fdeops - the second brain for Forward Deployed Engineers'"
Enter
Type "echo 'One skill. The memory writes itself. github.com/suboss87/fdeops'"
Enter
Sleep 4s
