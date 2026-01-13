// Mock Data for UI Components - Detailed Beamline Structures
import { BeamlineNode, BeamlineAudit, ServerStorage } from './types';

export const BEAMLINE_MANUALS: Array<{ name: string; data: BeamlineNode; description?: string }> = [
    {
        name: 'BL01',
        description: 'X-ray Diffraction & Crystallography',
        data: {
            name: 'BL01 - X-ray Diffraction',
            type: 'beamline',
            children: [
                {
                    name: '利用期開始時の立ち上げ',
                    type: 'system',
                    children: [

                        {
                            name: '機器立ち上げ',
                            type: 'procedure',
                            children: [
                                // {
                                //     name: 'Alignment Guide',
                                //     type: 'file',
                                //     fileUrl: '/docs/bl01/mono_alignment.pdf',
                                //     description: 'Monochromator alignment procedures'
                                // },
                                // {
                                //     name: 'Calibration Protocol',
                                //     type: 'file',
                                //     fileUrl: '/docs/bl01/mono_calibration.pdf',
                                //     description: 'Energy calibration steps'
                                // }
                                {
                                    name: '真空機器 立ち上げ',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '冷却系 立ち上げ',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '実験装置 利用期初立ち上げ',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '蛍光検出器の立ち上げ',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'User Manual - HPGe Specialty X-ray detectors - 36PIX',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/User Manual - HPGe Specialty X-ray detectors - 36PIX.pdf',
                                            description: 'Hardware manual'
                                        }

                                    ]
                                }
                            ]
                        },
                        {
                            name: 'ビーム調整',
                            type: 'procedure',
                            children: [
                                // {
                                //     name: 'Alignment Guide',
                                //     type: 'file',
                                //     fileUrl: '/docs/bl01/mono_alignment.pdf',
                                //     description: 'Monochromator alignment procedures'
                                // },
                                // {
                                //     name: 'Calibration Protocol',
                                //     type: 'file',
                                //     fileUrl: '/docs/bl01/mono_calibration.pdf',
                                //     description: 'Energy calibration steps'
                                // }
                                {
                                    name: 'ビーム 利用期初調整',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '光学系調整',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'BL01B1opticsman 041221',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/BL01B1opticsman041221.pdf',
                                            description: 'Arrangement of slits, mirrors, and spectrometers'
                                        },
                                        {
                                            name: 'BL01B1opticsman 160329',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/BL01B1opticsman160329.pdf',
                                            description: 'updated version of BL01B1opticsman041221'
                                        },
                                        {
                                            name: 'man_movetheta',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_movetheta.pdf',
                                            description: 'Operation manual for the spectrometer controller'
                                        },
                                        {
                                            name: 'SP8_BM分光器アラインメント手順_070607',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/SP8_BM分光器アラインメント手順_070607.pdf',
                                            description: 'offline and online alignment procedures'
                                        }
                                    ]
                                },
                                {
                                    name: 'ビーム定位置出射調整 、ミラー原点調整',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'ミラー精密光軸調整_060915',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/ミラー精密光軸調整_060915.pdf',
                                            description: 'Formulas and correction procedures'
                                        },
                                        {
                                            name: 'man_TCstage controller',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_TCstage_controller.pdf',
                                            description: 'Manual for the Transport Channel tilt'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            name: '実験装置調整',
                            type: 'procedure',
                            // children: [
                            //     {
                            //         name: 'Alignment Guide',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                            //         description: 'Monochromator alignment procedures'
                            //     },
                            //     {
                            //         name: 'Calibration Protocol',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                            //         description: 'Energy calibration steps'
                            //     }
                            // ]
                        }
                    ]
                },
                {
                    name: 'ビームライン利用実験運用',
                    type: 'system',
                    children: [
                        {
                            name: 'XAFS計測システム',
                            type: 'procedure',
                            children: [
                                {
                                    name: '準備 (HV印加, XRD/DRIFT切替, LN2補充',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'SSD_QuickReference 20240419',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/SSD_QuickReference_20240419.pdf',
                                            description: 'Quick guide for gain adjustment'
                                        }
                                    ]
                                },
                                {
                                    name: 'ビーム 調整',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '実験装置の調整',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'APN504_Quickreference 20221026',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/APN504_Quickreference_20221026.pdf',
                                            description: 'Instructions for setting up DSP'
                                        },
                                        {
                                            name: 'xManagerManual 071016J',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/xManagerManual071016J.pdf',
                                            description: 'manual for adjusting parameters (Peaking Time, etc.) '
                                        }
                                    ]
                                },
                                {
                                    name: 'ビーム 較正作業',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'man_deadtime correction for MSSD',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_deadtime correction for MSSD.pdf',
                                            description: 'correct dead time in measurement data'
                                        }
                                    ]
                                },
                                {
                                    name: '実験装置 実験レイアウトセットアップ',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '実験実施',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                                {
                                    name: '実験終了時作業',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                },
                            ]
                        },
                        {
                            name: 'ガス供給排気装置',
                            type: 'procedure',
                            children: [
                                {
                                    name: '実験装置の準備',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'man_Pfeiffer_GSD350',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_Pfeiffer_GSD350.pdf',
                                            description: 'installing and operating a gas analysis system'
                                        }
                                    ]
                                },
                                {
                                    name: '実験装置 実験レイアウトセットアップ',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'man_Agilent 990 Micro GC',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_Agilent%20990%20Micro%20GC.pdf',
                                            description: 'Gas chromatograph (Agilent 990) installation'
                                        },
                                        {
                                            name: 'QMAS-μGC操作マニュアルまとめ',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/QMAS-μGC操作マニュアルまとめ.pdf',
                                            description: 'Gas analyzer setup instructions'
                                        }
                                    ]
                                },
                                {
                                    name: '実験実施',
                                    type: 'procedure',
                                    children: [
                                        {
                                            name: 'man_gas_interlock',
                                            type: 'file',
                                            fileUrl: 'https://storage.cloud.google.com/docs-bl/bl01b1/man_gas_interlock.pdf',
                                            description: 'Instructions for the operation screen'
                                        }
                                    ]
                                },
                                {
                                    name: '実験終了時作業',
                                    type: 'procedure',
                                    // children: [
                                    //     {
                                    //         name: 'Alignment Guide',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                                    //         description: 'Monochromator alignment procedures'
                                    //     },
                                    //     {
                                    //         name: 'Calibration Protocol',
                                    //         type: 'file',
                                    //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                                    //         description: 'Energy calibration steps'
                                    //     }
                                    // ]
                                }
                            ]
                        }
                    ]
                },
                {
                    name: '利用期終了時',
                    type: 'system',
                    children: [
                        {
                            name: '機器立ち下げ (分光器移動)',
                            type: 'procedure',
                            // children: [
                            //     {
                            //         name: 'Alignment Guide',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                            //         description: 'Monochromator alignment procedures'
                            //     },
                            //     {
                            //         name: 'Calibration Protocol',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                            //         description: 'Energy calibration steps'
                            //     }
                            // ]
                        },
                        {
                            name: 'A期終了時（夏期点検調整期間開始時）',
                            type: 'procedure',
                            // children: [
                            //     {
                            //         name: 'Alignment Guide',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                            //         description: 'Monochromator alignment procedures'
                            //     },
                            //     {
                            //         name: 'Calibration Protocol',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                            //         description: 'Energy calibration steps'
                            //     }
                            // ]
                        },
                        {
                            name: 'B期終了時（年度末点検調整期間開始時）',
                            type: 'procedure',
                            // children: [
                            //     {
                            //         name: 'Alignment Guide',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_alignment.pdf',
                            //         description: 'Monochromator alignment procedures'
                            //     },
                            //     {
                            //         name: 'Calibration Protocol',
                            //         type: 'file',
                            //         fileUrl: '/docs/bl01/mono_calibration.pdf',
                            //         description: 'Energy calibration steps'
                            //     }
                            // ]
                        }
                    ]
                }
            ]
        }
    },
    {
        name: 'BL02',
        description: 'High-Energy X-ray Spectroscopy',
        data: {
            name: 'BL02 - X-ray Spectroscopy',
            type: 'beamline',
            children: [
                {
                    name: 'Safety & Compliance',
                    type: 'system',
                    children: [
                        {
                            name: 'High Energy Safety Guide',
                            type: 'file',
                            fileUrl: '/docs/bl02/high_energy_safety.pdf',
                            description: 'Safety procedures for high-energy operations'
                        },
                        {
                            name: 'PPE Requirements',
                            type: 'file',
                            fileUrl: '/docs/bl02/ppe_requirements.pdf',
                            description: 'Personal protective equipment specifications'
                        }
                    ]
                },
                {
                    name: 'Spectroscopy Equipment',
                    type: 'system',
                    children: [
                        {
                            name: 'Energy Analyzer',
                            type: 'procedure',
                            children: [
                                {
                                    name: 'Setup & Configuration',
                                    type: 'file',
                                    fileUrl: '/docs/bl02/analyzer_setup.pdf',
                                    description: 'Energy analyzer configuration guide'
                                },
                                {
                                    name: 'Maintenance Schedule',
                                    type: 'file',
                                    fileUrl: '/docs/bl02/analyzer_maintenance.pdf',
                                    description: 'Regular maintenance procedures'
                                }
                            ]
                        },
                        {
                            name: 'Fluorescence Detector',
                            type: 'procedure',
                            children: [
                                {
                                    name: 'Operating Manual',
                                    type: 'file',
                                    fileUrl: '/docs/bl02/fluorescence_manual.pdf',
                                    description: 'Fluorescence detector operations'
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'Measurement Protocols',
                    type: 'system',
                    children: [
                        {
                            name: 'XANES Measurements',
                            type: 'file',
                            fileUrl: '/docs/bl02/xanes_protocol.pdf',
                            description: 'X-ray Absorption Near Edge Structure'
                        },
                        {
                            name: 'EXAFS Measurements',
                            type: 'file',
                            fileUrl: '/docs/bl02/exafs_protocol.pdf',
                            description: 'Extended X-ray Absorption Fine Structure'
                        }
                    ]
                }
            ]
        }
    },
    {
        name: 'BL03',
        description: 'Soft X-ray Imaging & Microscopy',
        data: {
            name: 'BL03 - Soft X-ray Microscopy',
            type: 'beamline',
            children: [
                {
                    name: 'Imaging Systems',
                    type: 'system',
                    children: [
                        {
                            name: 'Scanning Microscope',
                            type: 'procedure',
                            children: [
                                {
                                    name: 'Operation Guide',
                                    type: 'file',
                                    fileUrl: '/docs/bl03/scanning_microscope.pdf',
                                    description: 'Scanning microscope operations'
                                },
                                {
                                    name: 'Image Processing',
                                    type: 'file',
                                    fileUrl: '/docs/bl03/image_processing.pdf',
                                    description: 'Post-acquisition image processing'
                                }
                            ]
                        },
                        {
                            name: 'Zone Plate Optics',
                            type: 'file',
                            fileUrl: '/docs/bl03/zone_plate.pdf',
                            description: 'Zone plate alignment and maintenance'
                        }
                    ]
                },
                {
                    name: 'Sample Environment',
                    type: 'system',
                    children: [
                        {
                            name: 'Vacuum Chamber Operations',
                            type: 'file',
                            fileUrl: '/docs/bl03/vacuum_chamber.pdf',
                            description: 'Vacuum system procedures'
                        },
                        {
                            name: 'Cryogenic Systems',
                            type: 'file',
                            fileUrl: '/docs/bl03/cryo_systems.pdf',
                            description: 'Low-temperature sample handling'
                        }
                    ]
                }
            ]
        }
    }
];

// Generate remaining beamlines (BL04-BL26) with varied structures
const beamlineTemplates = [
    {
        type: 'Powder Diffraction',
        systems: ['Diffractometer', 'Sample Changer', 'Temperature Control']
    },
    {
        type: 'Protein Crystallography',
        systems: ['Goniometer', 'Cryo-Cooling', 'Auto-Mounting']
    },
    {
        type: 'Small Angle Scattering',
        systems: ['SAXS Detector', 'Flow Cell', 'Sample Loader']
    },
    {
        type: 'Tomography & Imaging',
        systems: ['Rotation Stage', 'Flat Panel Detector', 'Reconstruction Software']
    },
    {
        type: 'Magnetic Scattering',
        systems: ['Polarization Analysis', 'Magnet Systems', 'Spin Detector']
    },
    {
        type: 'Time-Resolved Studies',
        systems: ['Laser Pump', 'Fast Detector', 'Timing System']
    },
    {
        type: 'High Pressure Research',
        systems: ['Diamond Anvil Cell', 'Pressure Calibration', 'Gasket Preparation']
    },
    {
        type: 'Surface Diffraction',
        systems: ['UHV Chamber', 'Surface Preparation', 'LEED System']
    }
];

for (let i = 4; i <= 26; i++) {
    const blNum = i.toString().padStart(2, '0');
    const template = beamlineTemplates[(i - 4) % beamlineTemplates.length];

    BEAMLINE_MANUALS.push({
        name: `BL${blNum}`,
        description: template.type,
        data: {
            name: `BL${blNum} - ${template.type}`,
            type: 'beamline',
            children: [
                {
                    name: 'Safety Documentation',
                    type: 'system',
                    children: [
                        {
                            name: 'Standard Operating Procedures',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/sop.pdf`,
                            description: 'Standard operating procedures'
                        },
                        {
                            name: 'Risk Assessment',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/risk_assessment.pdf`,
                            description: 'Beamline risk assessment document'
                        }
                    ]
                },
                {
                    name: 'Equipment & Instrumentation',
                    type: 'system',
                    children: template.systems.map(system => ({
                        name: system,
                        type: 'procedure' as const,
                        children: [
                            {
                                name: 'User Manual',
                                type: 'file' as const,
                                fileUrl: `/docs/bl${blNum}/${system.toLowerCase().replace(/\s+/g, '_')}_manual.pdf`,
                                description: `${system} operation manual`
                            },
                            {
                                name: 'Troubleshooting Guide',
                                type: 'file' as const,
                                fileUrl: `/docs/bl${blNum}/${system.toLowerCase().replace(/\s+/g, '_')}_troubleshooting.pdf`,
                                description: `${system} troubleshooting procedures`
                            }
                        ]
                    }))
                },
                {
                    name: 'Experimental Methods',
                    type: 'system',
                    children: [
                        {
                            name: 'Measurement Protocols',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/measurement_protocols.pdf`,
                            description: 'Standard measurement procedures'
                        },
                        {
                            name: 'Data Analysis Guide',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/data_analysis.pdf`,
                            description: 'Data processing and analysis methods'
                        }
                    ]
                },
                {
                    name: 'Maintenance Records',
                    type: 'system',
                    children: [
                        {
                            name: 'Preventive Maintenance',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/preventive_maintenance.pdf`,
                            description: 'Scheduled maintenance procedures'
                        },
                        {
                            name: 'Calibration Log',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/calibration_log.pdf`,
                            description: 'Equipment calibration records'
                        }
                    ]
                }
            ]
        }
    });
}

export const MOCK_AUDITS: BeamlineAudit[] = [
    {
        id: 'audit-bl01',
        name: 'BL01',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'All safety documentation complete'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'partial',
                comment: 'Missing detector calibration docs'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'complete',
                comment: 'All protocols documented'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'complete',
                comment: 'Up to date'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'partial',
                comment: 'Need advanced training modules'
            }
        ]
    },
    {
        id: 'audit-bl02',
        name: 'BL02',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'High-energy safety protocols verified'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'complete',
                comment: 'All equipment manuals current'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'complete',
                comment: 'XANES and EXAFS protocols complete'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'partial',
                comment: 'Missing Q2 calibration logs'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'complete',
                comment: 'Comprehensive training package'
            }
        ]
    },
    {
        id: 'audit-bl03',
        name: 'BL03',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'Vacuum and cryo safety complete'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'complete',
                comment: 'All imaging systems documented'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'partial',
                comment: 'Need tomography reconstruction guide'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'complete',
                comment: 'Regular maintenance logged'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'missing',
                comment: 'Training materials not yet created'
            }
        ]
    },
    {
        id: 'audit-bl04',
        name: 'BL04',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'Standard safety protocols in place'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'partial',
                comment: 'Diffractometer manual needs update'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'complete',
                comment: 'Powder diffraction protocols complete'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'complete',
                comment: 'All records current'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'complete',
                comment: 'Basic and advanced training available'
            }
        ]
    },
    {
        id: 'audit-bl05',
        name: 'BL05',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'Cryo safety protocols verified'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'complete',
                comment: 'Goniometer and cryo systems documented'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'complete',
                comment: 'Protein crystallography workflows complete'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'partial',
                comment: 'Need to update auto-mounting logs'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'complete',
                comment: 'Comprehensive user guide available'
            }
        ]
    },
    {
        id: 'audit-bl06',
        name: 'BL06',
        items: [
            {
                id: '1',
                category: 'Safety Procedures',
                status: 'complete',
                comment: 'All safety requirements met'
            },
            {
                id: '2',
                category: 'Equipment Manuals',
                status: 'complete',
                comment: 'SAXS detector and flow cell documented'
            },
            {
                id: '3',
                category: 'Experimental Procedures',
                status: 'partial',
                comment: 'Need time-resolved SAXS protocol'
            },
            {
                id: '4',
                category: 'Maintenance Records',
                status: 'complete',
                comment: 'Regular maintenance up to date'
            },
            {
                id: '5',
                category: 'User Training Materials',
                status: 'partial',
                comment: 'Basic training only, need advanced'
            }
        ]
    }
];

export const INITIAL_SERVER_STORAGE: ServerStorage = {
    'BL01': 'JASRI Master File Content for BL01 - X-ray Diffraction...',
    'BL02': 'JASRI Master File Content for BL02 - X-ray Spectroscopy...',
    'BL03': 'JASRI Master File Content for BL03 - Soft X-ray Microscopy...'
};
