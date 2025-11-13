export const COLORS = [
    { border: '#ff0037', background: '#ff0037' },
    { border: '#1dc942ff', background: '#1dc942ff' },
    { border: '#a73addff', background: '#a73addff' },
    { border: '#4f0272', background: '#4f0272' },
    { border: '#ff7f0e', background: '#ff7f0e' },
    { border: '#38e1ffff', background: '#38e1ffff' }
];

export const Y_AXIS_PRESETS = {
    FH: [
        ["Treating Pressure", "TR_PRESS"], 
        ["SLUR_RATE", "Slurry Rate"], 
        ["Slurry Proppant Conc", "SLURRY_CONC"], 
        ["BH Proppant Conc"], 
        ["FightR LXD Conc", "Fight LXD Conc"],
        ["FightR Conc", "Fight Conc"]
    ],
    PD: [
        ["Treating Pressure", "TR_PRESS"], 
        ["SLUR_RATE", "Slurry Rate"], 
        ["W1 Line Speed"], 
        ["W1 Depth"], 
        ["W1 Surface Line Tension"]
    ],
    DEFAULT: [
        ["Treating Pressure", "TR_PRESS"],
        ["SLUR_RATE", "Slurry Rate"]
    ]
};