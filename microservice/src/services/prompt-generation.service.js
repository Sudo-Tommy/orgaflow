/**
 * prompt-generation.service.js
 *
 * Microservice Service-Schnittstelle zur Erstellung automatisierter Lösungs-
 * und Maßnahmenkonzepte für OrgaFlow.
 */

import { generateSolutionConcept } from '../../solutionConceptService.js';

export { generateSolutionConcept };

export async function generateSolution(payload) {
    return await generateSolutionConcept(payload);
}

export default {
    generateSolutionConcept,
    generateSolution
};
