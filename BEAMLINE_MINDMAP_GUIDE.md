# Beamline Mindmap Structure Guide

## Overview

Each of the 26 beamlines now has a **unique, hierarchical mindmap structure** that reflects its specific equipment, procedures, and documentation.

## Structure Levels

The mindmap hierarchy follows this pattern:

```
Beamline (Root)
├── System Category (e.g., "Safety Protocols", "Equipment Manuals")
│   ├── Procedure/Equipment Group
│   │   └── Individual Files (PDFs, manuals, guides)
│   └── Individual Files
└── System Category
    └── Files
```

## Beamline Types & Specializations

### Detailed Beamlines (BL01-BL03)

**BL01 - X-ray Diffraction & Crystallography**
- Safety Protocols → Radiation Safety, Emergency Procedures
- Equipment Manuals → Monochromator (Alignment, Calibration), Detector Systems
- Experimental Procedures → Sample Preparation, Data Collection

**BL02 - High-Energy X-ray Spectroscopy**
- Safety & Compliance → High Energy Safety, PPE Requirements
- Spectroscopy Equipment → Energy Analyzer, Fluorescence Detector
- Measurement Protocols → XANES, EXAFS

**BL03 - Soft X-ray Microscopy**
- Imaging Systems → Scanning Microscope, Zone Plate Optics
- Sample Environment → Vacuum Chamber, Cryogenic Systems

### Template-Based Beamlines (BL04-BL26)

Each beamline uses one of 8 specialized templates that cycle through:

1. **Powder Diffraction** (BL04, BL12, BL20)
   - Diffractometer, Sample Changer, Temperature Control

2. **Protein Crystallography** (BL05, BL13, BL21)
   - Goniometer, Cryo-Cooling, Auto-Mounting

3. **Small Angle Scattering** (BL06, BL14, BL22)
   - SAXS Detector, Flow Cell, Sample Loader

4. **Tomography & Imaging** (BL07, BL15, BL23)
   - Rotation Stage, Flat Panel Detector, Reconstruction Software

5. **Magnetic Scattering** (BL08, BL16, BL24)
   - Polarization Analysis, Magnet Systems, Spin Detector

6. **Time-Resolved Studies** (BL09, BL17, BL25)
   - Laser Pump, Fast Detector, Timing System

7. **High Pressure Research** (BL10, BL18, BL26)
   - Diamond Anvil Cell, Pressure Calibration, Gasket Preparation

8. **Surface Diffraction** (BL11, BL19)
   - UHV Chamber, Surface Preparation, LEED System

## Common Structure for All Beamlines

Every beamline (BL04-BL26) includes these standard categories:

1. **Safety Documentation**
   - Standard Operating Procedures
   - Risk Assessment

2. **Equipment & Instrumentation**
   - Specific to beamline type (3 equipment systems)
   - Each equipment has: User Manual, Troubleshooting Guide

3. **Experimental Methods**
   - Measurement Protocols
   - Data Analysis Guide

4. **Maintenance Records**
   - Preventive Maintenance
   - Calibration Log

## How to Customize Further

### Option 1: Edit Existing Beamlines

Modify the detailed beamlines (BL01-BL03) in `mockData.ts`:

```typescript
{
    name: 'BL01',
    description: 'Your Custom Description',
    data: {
        name: 'BL01 - Your Custom Name',
        type: 'beamline',
        children: [
            {
                name: 'Your Category',
                type: 'system',
                children: [
                    {
                        name: 'Your File',
                        type: 'file',
                        fileUrl: '/docs/your_file.pdf',
                        description: 'Your description'
                    }
                ]
            }
        ]
    }
}
```

### Option 2: Add New Templates

Add new beamline types to the `beamlineTemplates` array:

```typescript
const beamlineTemplates = [
    // ... existing templates
    {
        type: 'Your New Beamline Type',
        systems: ['System 1', 'System 2', 'System 3']
    }
];
```

### Option 3: Create Completely Custom Beamlines

Replace any beamline in the loop with a custom structure:

```typescript
// After the loop, override specific beamlines
const bl15Index = BEAMLINE_MANUALS.findIndex(bl => bl.name === 'BL15');
if (bl15Index !== -1) {
    BEAMLINE_MANUALS[bl15Index] = {
        name: 'BL15',
        description: 'Custom Beamline',
        data: {
            // Your custom structure
        }
    };
}
```

## Node Types

The mindmap uses these node types for visual distinction:

- `beamline` - Root node (beamline name)
- `system` - Major category (blue indicator)
- `procedure` - Sub-category/equipment group (blue indicator)
- `file` - Actual documents (orange indicator)

## File URL Structure

All file URLs follow this pattern:
```
/docs/bl{XX}/{category}_{item}.pdf
```

Examples:
- `/docs/bl01/radiation_safety.pdf`
- `/docs/bl04/diffractometer_manual.pdf`
- `/docs/bl15/measurement_protocols.pdf`

## Visual Features

- **Collapsible nodes**: Click any system/procedure node to expand/collapse
- **Path highlighting**: Selected files show green path from root
- **Color coding**: 
  - Blue dot = System/Procedure
  - Orange dot = File
  - Green path = Active selection
- **Zoom controls**: +/- buttons and reset view
- **Auto-centering**: Clicking a node centers it in view

## Next Steps

1. **Replace with real data**: Update file URLs to point to actual documents
2. **Add more detail**: Expand BL04-BL26 with unique structures like BL01-BL03
3. **Dynamic loading**: Fetch beamline structures from a database/API
4. **Search functionality**: Add search across all beamline documentation
