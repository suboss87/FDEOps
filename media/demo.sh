#!/bin/bash
# fdeops - install on your machine, notes separate from workspace

P='\033[2;37m$ \033[0m'
AI='\033[1;36m'
U='\033[1;37m'
Y='\033[1;33m'
G='\033[2;32m'
D='\033[2;37m'
B='\033[1;34m'
R='\033[0m'

say() { printf "${AI}%s${R}\n" "$1"; sleep 0.028; }

clear
printf "${D}fdeops - your agent + private engagement notes${R}\n\n"
sleep 0.9

printf "${Y}▸ Install (once)${R}\n\n"
printf "${P}npx fdeops@latest${R}\n"
printf "${G}  ✓ skills → ~/.claude/skills/${R}\n\n"
sleep 1.0

printf "${P}npx fdeops@latest init retailbank${R}\n"
printf "${G}  ✓ ~/fde-engagements/retailbank/.fde/${R}\n\n"
sleep 1.2

printf "${Y}▸ Your workspace (whatever access you have)${R}\n\n"
printf "${B}  open project / repo / remote env${R}\n"
printf "${D}  FDEOPS_ENGAGEMENT=~/fde-engagements/retailbank/.fde${R}\n\n"
sleep 1.0

printf "${P}@fde "
printf "${U}Day 1. Exec readout in 30 min. Brief says fix payments.${R}\n\n"
sleep 0.6
say "What would make this a bad engagement for them - not just late? Log brief.md."
printf "${G}  → ~/fde-engagements/retailbank/.fde/brief.md${R}\n\n"
sleep 2.0

printf "${P}@fde "
printf "${U}Ship thin slice Friday. Legacy module.${R}\n\n"
sleep 0.5
say "Characterise first. Tests, then smallest visible path."
printf "${G}  → decisions.md · delivery.md${R}\n"
printf "${D}  (delivery in your normal workflow)${R}\n\n"
sleep 2.2
