/**
 * Beamline Template Generator
 * 
 * This file provides a template for adding new beamlines to mockData.ts
 * 
 * USAGE OPTION 1 - Use as a Node.js module:
 *   const template = require('./beamline-template');
 *   console.log(JSON.stringify(template.generateBeamlineTemplate('BL27', 'Powder Diffraction'), null, 2));
 * 
 * USAGE OPTION 2 - Copy the TEMPLATE constant below and replace placeholders manually
 */

/**
 * Generate a beamline template with the given ID and type
 * @param {string} beamlineId - e.g., 'BL27'
 * @param {string} beamlineType - e.g., 'Powder Diffraction'
 * @returns {object} Beamline template object ready to add to BEAMLINE_MANUALS
 */
function generateBeamlineTemplate(beamlineId, beamlineType) {
    const blNum = beamlineId.toLowerCase().replace('bl', '');

    return {
        name: beamlineId,
        description: beamlineType,
        data: {
            name: `${beamlineId} - ${beamlineType}`,
            type: 'beamline',
            children: [
                // ========================================
                // SAFETY DOCUMENTATION
                // ========================================
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
                        },
                        {
                            name: 'Emergency Procedures',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/emergency_procedures.pdf`,
                            description: 'Emergency shutdown and safety protocols'
                        }
                    ]
                },

                // ========================================
                // EQUIPMENT & INSTRUMENTATION
                // ========================================
                {
                    name: 'Equipment & Instrumentation',
                    type: 'system',
                    children: [
                        {
                            name: 'Primary Equipment',
                            type: 'procedure',
                            children: [
                                {
                                    name: 'User Manual',
                                    type: 'file',
                                    fileUrl: `/docs/bl${blNum}/equipment_manual.pdf`,
                                    description: 'Equipment operation manual'
                                },
                                {
                                    name: 'Maintenance Guide',
                                    type: 'file',
                                    fileUrl: `/docs/bl${blNum}/equipment_maintenance.pdf`,
                                    description: 'Regular maintenance procedures'
                                },
                                {
                                    name: 'Troubleshooting Guide',
                                    type: 'file',
                                    fileUrl: `/docs/bl${blNum}/equipment_troubleshooting.pdf`,
                                    description: 'Common issues and solutions'
                                }
                            ]
                        }
                    ]
                },

                // ========================================
                // EXPERIMENTAL PROCEDURES
                // ========================================
                {
                    name: 'Experimental Procedures',
                    type: 'system',
                    children: [
                        {
                            name: 'Sample Preparation',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/sample_preparation.pdf`,
                            description: 'Sample preparation guidelines'
                        },
                        {
                            name: 'Measurement Protocols',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/measurement_protocols.pdf`,
                            description: 'Standard measurement procedures'
                        },
                        {
                            name: 'Data Collection',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/data_collection.pdf`,
                            description: 'Data collection best practices'
                        },
                        {
                            name: 'Data Analysis Guide',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/data_analysis.pdf`,
                            description: 'Data processing and analysis methods'
                        }
                    ]
                },

                // ========================================
                // MAINTENANCE & CALIBRATION
                // ========================================
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
                            name: 'Calibration Procedures',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/calibration.pdf`,
                            description: 'Equipment calibration procedures'
                        },
                        {
                            name: 'Calibration Log',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/calibration_log.pdf`,
                            description: 'Equipment calibration records'
                        }
                    ]
                },

                // ========================================
                // USER TRAINING
                // ========================================
                {
                    name: 'User Training Materials',
                    type: 'system',
                    children: [
                        {
                            name: 'Basic Training Guide',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/basic_training.pdf`,
                            description: 'Introduction and basic operations'
                        },
                        {
                            name: 'Advanced Training Guide',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/advanced_training.pdf`,
                            description: 'Advanced techniques and optimization'
                        },
                        {
                            name: 'Quick Reference Card',
                            type: 'file',
                            fileUrl: `/docs/bl${blNum}/quick_reference.pdf`,
                            description: 'Quick reference for common tasks'
                        }
                    ]
                }
            ]
        }
    };
}

// Export for use as a module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateBeamlineTemplate
    };
}

// ============================================
// STATIC TEMPLATE (for manual copy-paste)
// ============================================
// Copy everything between the START and END markers below

/* ===== TEMPLATE START =====

{
    name: 'BL##',  // ← Change to your beamline number (e.g., 'BL27')
    description: 'Your Beamline Type',  // ← Change to beamline description
    data: {
        name: 'BL## - Your Beamline Name',  // ← Change to full beamline name
        type: 'beamline',
        children: [
            {
                name: 'Safety Documentation',
                type: 'system',
                children: [
                    {
                        name: 'Standard Operating Procedures',
                        type: 'file',
                        fileUrl: '/docs/bl##/sop.pdf',  // ← Update ## with your beamline number
                        description: 'Standard operating procedures'
                    },
                    {
                        name: 'Risk Assessment',
                        type: 'file',
                        fileUrl: '/docs/bl##/risk_assessment.pdf',
                        description: 'Beamline risk assessment document'
                    }
                ]
            },
            {
                name: 'Equipment & Instrumentation',
                type: 'system',
                children: [
                    {
                        name: 'Primary Equipment',
                        type: 'procedure',
                        children: [
                            {
                                name: 'User Manual',
                                type: 'file',
                                fileUrl: '/docs/bl##/equipment_manual.pdf',
                                description: 'Equipment operation manual'
                            }
                        ]
                    }
                ]
            },
            {
                name: 'Experimental Procedures',
                type: 'system',
                children: [
                    {
                        name: 'Measurement Protocols',
                        type: 'file',
                        fileUrl: '/docs/bl##/measurement_protocols.pdf',
                        description: 'Standard measurement procedures'
                    }
                ]
            }
        ]
    }
}

===== TEMPLATE END ===== */

/**
 * USAGE EXAMPLES:
 * 
 * Example 1 - Generate template programmatically:
 * ------------------------------------------------
 * const { generateBeamlineTemplate } = require('./beamline-template');
 * const newBeamline = generateBeamlineTemplate('BL27', 'Powder Diffraction');
 * console.log(JSON.stringify(newBeamline, null, 2));
 * 
 * 
 * Example 2 - Copy static template and replace manually:
 * -------------------------------------------------------
 * 1. Copy the template between START and END markers above
 * 2. Replace all 'BL##' with your beamline number (e.g., 'BL27')
 * 3. Update descriptions and equipment names
 * 4. Add to mockData.ts:
 * 
 *    BEAMLINE_MANUALS.push({
 *      // paste template here
 *    });
 * 
 * 
 * Example 3 - Upload files and update URLs:
 * ------------------------------------------
 * 1. Upload your files:
 *    node scripts/batch-upload.js BL27 ./bl27_documents
 * 
 * 2. Copy the generated code from the script output
 * 
 * 3. Update fileUrl values in your template with the actual URLs
 */
