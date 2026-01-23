import { Firestore } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firestore
const firestore = new Firestore({
    projectId: process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
});

const COLLECTION_NAME = 'standardStructures';

export interface StandardSection {
    id: string;
    name: string;
    description: string;
    category: string;
    required: boolean;
    subsections?: StandardSection[];
    keywords?: string[];
    examples?: string[];
}

export interface StandardStructure {
    id: string;
    version: string;
    name: string;
    description: string;
    sections: StandardSection[];
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export class StandardStructureService {
    /**
     * Create a new standard structure
     */
    static async createStructure(
        name: string,
        description: string,
        sections: StandardSection[],
        version?: string
    ): Promise<StandardStructure> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const structure: StandardStructure = {
            id,
            version: version || '1.0.0',
            name,
            description,
            sections,
            createdAt: now,
            updatedAt: now,
            isActive: false,
        };

        await firestore.collection(COLLECTION_NAME).doc(id).set(structure);
        console.log(`✅ Created standard structure: ${name} (v${structure.version})`);

        return structure;
    }

    /**
     * Get a standard structure by ID
     */
    static async getStructureById(id: string): Promise<StandardStructure | null> {
        const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return doc.data() as StandardStructure;
    }

    /**
     * Get the active standard structure
     */
    static async getActiveStructure(): Promise<StandardStructure | null> {
        const snapshot = await firestore
            .collection(COLLECTION_NAME)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        return snapshot.docs[0].data() as StandardStructure;
    }

    /**
     * Get all standard structures
     */
    static async getAllStructures(): Promise<StandardStructure[]> {
        const snapshot = await firestore
            .collection(COLLECTION_NAME)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data() as StandardStructure);
    }

    /**
     * Update a standard structure
     */
    static async updateStructure(
        id: string,
        updates: Partial<Omit<StandardStructure, 'id' | 'createdAt'>>
    ): Promise<StandardStructure> {
        const existingDoc = await firestore.collection(COLLECTION_NAME).doc(id).get();

        if (!existingDoc.exists) {
            throw new Error(`Standard structure not found: ${id}`);
        }

        const updatedStructure = {
            ...existingDoc.data(),
            ...updates,
            updatedAt: new Date().toISOString(),
        } as StandardStructure;

        await firestore.collection(COLLECTION_NAME).doc(id).update(updatedStructure);
        console.log(`✅ Updated standard structure: ${id}`);

        return updatedStructure;
    }

    /**
     * Delete a standard structure
     */
    static async deleteStructure(id: string): Promise<void> {
        const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();

        if (!doc.exists) {
            throw new Error(`Standard structure not found: ${id}`);
        }

        const structure = doc.data() as StandardStructure;

        if (structure.isActive) {
            throw new Error('Cannot delete active standard structure. Please activate another structure first.');
        }

        await firestore.collection(COLLECTION_NAME).doc(id).delete();
        console.log(`✅ Deleted standard structure: ${id}`);
    }

    /**
     * Activate a standard structure (and deactivate all others)
     */
    static async activateStructure(id: string): Promise<StandardStructure> {
        const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();

        if (!doc.exists) {
            throw new Error(`Standard structure not found: ${id}`);
        }

        // Deactivate all other structures
        const allStructures = await firestore
            .collection(COLLECTION_NAME)
            .where('isActive', '==', true)
            .get();

        const batch = firestore.batch();

        allStructures.docs.forEach(doc => {
            batch.update(doc.ref, { isActive: false, updatedAt: new Date().toISOString() });
        });

        // Activate the target structure
        const updatedStructure = {
            ...doc.data(),
            isActive: true,
            updatedAt: new Date().toISOString(),
        } as StandardStructure;

        batch.update(doc.ref, { isActive: true, updatedAt: new Date().toISOString() });

        await batch.commit();
        console.log(`✅ Activated standard structure: ${id}`);

        return updatedStructure;
    }

    /**
     * Validate a standard structure
     */
    static validateStructure(structure: Partial<StandardStructure>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!structure.name || structure.name.trim() === '') {
            errors.push('Structure name is required');
        }

        if (!structure.version || structure.version.trim() === '') {
            errors.push('Structure version is required');
        }

        if (!structure.sections || structure.sections.length === 0) {
            errors.push('Structure must have at least one section');
        }

        if (structure.sections) {
            structure.sections.forEach((section, index) => {
                if (!section.name || section.name.trim() === '') {
                    errors.push(`Section ${index + 1}: name is required`);
                }
                if (!section.category || section.category.trim() === '') {
                    errors.push(`Section ${index + 1}: category is required`);
                }
                if (section.required === undefined || section.required === null) {
                    errors.push(`Section ${index + 1}: required field must be specified`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Import structure from JSON
     */
    static async importStructure(jsonData: string): Promise<StandardStructure> {
        try {
            const data = JSON.parse(jsonData);

            // Validate the imported data
            const validation = this.validateStructure(data);
            if (!validation.valid) {
                throw new Error(`Invalid structure data: ${validation.errors.join(', ')}`);
            }

            // Create the structure
            return await this.createStructure(
                data.name,
                data.description || '',
                data.sections,
                data.version
            );
        } catch (error) {
            console.error('Error importing structure:', error);
            throw new Error(`Failed to import structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Export structure to JSON
     */
    static async exportStructure(id: string): Promise<string> {
        const structure = await this.getStructureById(id);

        if (!structure) {
            throw new Error(`Standard structure not found: ${id}`);
        }

        // Remove internal fields for export
        const exportData = {
            name: structure.name,
            version: structure.version,
            description: structure.description,
            sections: structure.sections,
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Get all sections from a structure (flattened)
     */
    static flattenSections(sections: StandardSection[]): StandardSection[] {
        const flattened: StandardSection[] = [];

        const flatten = (sections: StandardSection[]) => {
            sections.forEach(section => {
                flattened.push(section);
                if (section.subsections && section.subsections.length > 0) {
                    flatten(section.subsections);
                }
            });
        };

        flatten(sections);
        return flattened;
    }

    /**
     * Find a section by ID in a structure
     */
    static findSectionById(sections: StandardSection[], sectionId: string): StandardSection | null {
        for (const section of sections) {
            if (section.id === sectionId) {
                return section;
            }
            if (section.subsections && section.subsections.length > 0) {
                const found = this.findSectionById(section.subsections, sectionId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Create a default standard structure template
     */
    static async createDefaultStructure(): Promise<StandardStructure> {
        const defaultSections: StandardSection[] = [
            {
                id: uuidv4(),
                name: 'Safety Procedures',
                description: 'All safety-related procedures and protocols',
                category: 'Safety',
                required: true,
                keywords: ['safety', 'emergency', 'hazard', 'protection', 'PPE'],
                examples: [
                    'Emergency shutdown procedures must be followed in case of radiation leak.',
                    'All personnel must wear appropriate personal protective equipment (PPE) when entering the experimental hutch.',
                ],
                subsections: [
                    {
                        id: uuidv4(),
                        name: 'Emergency Shutdown',
                        description: 'Emergency power-down and shutdown procedures',
                        category: 'Safety',
                        required: true,
                        keywords: ['emergency', 'shutdown', 'power-down', 'stop'],
                        examples: ['Press the red emergency stop button to immediately halt all operations.'],
                    },
                    {
                        id: uuidv4(),
                        name: 'Personal Protective Equipment',
                        description: 'Required PPE and usage guidelines',
                        category: 'Safety',
                        required: true,
                        keywords: ['PPE', 'protective equipment', 'safety gear', 'gloves', 'goggles'],
                        examples: ['Safety goggles and radiation badges must be worn at all times in the beamline area.'],
                    },
                ],
            },
            {
                id: uuidv4(),
                name: 'Vacuum Systems',
                description: 'Vacuum system operation and maintenance',
                category: 'Operations',
                required: true,
                keywords: ['vacuum', 'pressure', 'pump', 'chamber', 'Pa', 'Torr'],
                examples: [
                    'The pressure in the sample chamber must be maintained at 10^-7 Pa using the ion pump.',
                    'Turbo molecular pumps should be operated at maximum speed during initial pumpdown.',
                ],
            },
            {
                id: uuidv4(),
                name: 'Optical Hutch',
                description: 'Optical hutch setup and alignment procedures',
                category: 'Operations',
                required: false,
                keywords: ['optical', 'hutch', 'alignment', 'mirror', 'monochromator'],
                examples: [
                    'The monochromator crystal should be aligned using the piezo actuators.',
                    'Mirror angles can be adjusted using the remote control panel.',
                ],
            },
            {
                id: uuidv4(),
                name: 'Motor Control',
                description: 'Motor control systems and positioning',
                category: 'Operations',
                required: true,
                keywords: ['motor', 'actuator', 'positioning', 'stage', 'encoder'],
                examples: [
                    'All motor positions are controlled via the EPICS interface.',
                    'Encoder readings should be verified after each movement.',
                ],
            },
            {
                id: uuidv4(),
                name: 'Maintenance Procedures',
                description: 'Regular maintenance and troubleshooting',
                category: 'Maintenance',
                required: true,
                keywords: ['maintenance', 'service', 'repair', 'troubleshooting', 'inspection'],
                examples: [
                    'Vacuum pumps should be serviced every 6 months.',
                    'Check all cable connections during monthly inspections.',
                ],
            },
        ];

        return await this.createStructure(
            'Default Beamline Manual Structure',
            'Standard structure template for beamline operation manuals',
            defaultSections,
            '1.0.0'
        );
    }
}
