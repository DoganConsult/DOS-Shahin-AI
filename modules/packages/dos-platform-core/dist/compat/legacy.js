"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notReadyTenants = void 0;
exports.getLatestMaturity = getLatestMaturity;
exports.getMaturityHistory = getMaturityHistory;
exports.getMaturityTrends = getMaturityTrends;
exports.computeMaturityScore = computeMaturityScore;
exports.computeMaturityLevel = computeMaturityLevel;
exports.checkMaturityThreshold = checkMaturityThreshold;
exports.recordMaturityAssessment = recordMaturityAssessment;
exports.generateExecutiveSummary = generateExecutiveSummary;
exports.generateHealthReport = generateHealthReport;
exports.computeAutoSuggestions = computeAutoSuggestions;
exports.getDocumentElements = getDocumentElements;
exports.resolveImpact = resolveImpact;
exports.resolveSettingWithInheritance = resolveSettingWithInheritance;
exports.getSetting = getSetting;
exports.encryptCredentialObject = encryptCredentialObject;
exports.decryptCredentialObject = decryptCredentialObject;
exports.recordActivity = recordActivity;
exports.createLink = createLink;
exports.getLinksForEntity = getLinksForEntity;
exports.getTenantBranding = getTenantBranding;
exports.getModuleShellConfig = getModuleShellConfig;
exports.listUserPreferences = listUserPreferences;
exports.listTenantConfig = listTenantConfig;
exports.saveUserShellPreference = saveUserShellPreference;
exports.saveTenantShellOverride = saveTenantShellOverride;
exports.saveRoleShellOverride = saveRoleShellOverride;
exports.removeShellOverride = removeShellOverride;
exports.registerTaskHandler = registerTaskHandler;
exports.getAgentResourceAllocation = getAgentResourceAllocation;
exports.isOpenClawAvailable = isOpenClawAvailable;
exports.getOpenClawServiceConfig = getOpenClawServiceConfig;
exports.listOpenClawTools = listOpenClawTools;
exports.listOpenClawResources = listOpenClawResources;
exports.executeOpenClawTool = executeOpenClawTool;
exports.proposeCalibration = proposeCalibration;
exports.submitCalibration = submitCalibration;
exports.acceptCalibration = acceptCalibration;
exports.getCalibration = getCalibration;
exports.listCalibrations = listCalibrations;
exports.generateTeamRecommendation = generateTeamRecommendation;
exports.getTeamRecommendation = getTeamRecommendation;
exports.saveTeamRecommendation = saveTeamRecommendation;
exports.applyTeamRecommendation = applyTeamRecommendation;
exports.generateRoadmap = generateRoadmap;
exports.createRoadmap = createRoadmap;
exports.getRoadmap = getRoadmap;
exports.updateTaskStatus = updateTaskStatus;
exports.getNextPendingTask = getNextPendingTask;
exports.getActivatedTemplates = getActivatedTemplates;
exports.activateTemplateForPhase = activateTemplateForPhase;
exports.saveActivatedTemplate = saveActivatedTemplate;
exports.getBusinessFunctions = getBusinessFunctions;
exports.getStaffingForOrgSize = getStaffingForOrgSize;
const node_crypto_1 = require("node:crypto");
const openclaw_bridge_1 = require("./openclaw-bridge");
exports.notReadyTenants = new Set();
async function getLatestMaturity(_tenantId) {
    return null;
}
async function getMaturityHistory(_tenantId) {
    return [];
}
async function getMaturityTrends(_tenantId) {
    return {};
}
function computeMaturityScore(_input) {
    return 0;
}
function computeMaturityLevel(_score) {
    return 1;
}
function checkMaturityThreshold(_level, _threshold) {
    return false;
}
async function recordMaturityAssessment(_tenantId, _assessment) { }
async function generateExecutiveSummary(_tenantId) {
    return { summary: '', recommendations: [], generatedAt: new Date().toISOString() };
}
async function generateHealthReport(_tenantId) {
    return { generatedAt: new Date().toISOString() };
}
function computeAutoSuggestions(_input) {
    return [];
}
async function getDocumentElements(_tenantId, _documentId) {
    return [];
}
async function resolveImpact(_tenantId, _input) {
    return {};
}
async function resolveSettingWithInheritance(_tenantId, _key) {
    return undefined;
}
async function getSetting(_tenantId, _key) {
    return undefined;
}
function credentialKey() {
    const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!raw)
        throw new Error('CREDENTIAL_ENCRYPTION_KEY is required');
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32)
        throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (base64)');
    return buf;
}
function encryptCredentialObject(obj) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', credentialKey(), iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
}
function decryptCredentialObject(payload) {
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const data = Buffer.from(payload.data, 'base64');
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', credentialKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}
async function recordActivity(_tenantId, _entry) { }
async function createLink(_tenantId, _userId, _link) {
    return { linkId: 'link-' + Date.now() };
}
async function getLinksForEntity(_tenantId, _entityType, _entityId) {
    return [];
}
async function getTenantBranding(_tenantId) {
    return {};
}
async function getModuleShellConfig(_tenantId, _moduleCode) {
    return {};
}
async function listUserPreferences(_tenantId, _userId) {
    return [];
}
async function listTenantConfig(_tenantId) {
    return [];
}
async function saveUserShellPreference(_tenantId, _userId, _pref) { }
async function saveTenantShellOverride(_tenantId, _override) { }
async function saveRoleShellOverride(_tenantId, _roleCode, _override) { }
async function removeShellOverride(_tenantId, _overrideId) { }
const _taskHandlers = new Map();
function registerTaskHandler(code, handler) {
    _taskHandlers.set(code, handler);
}
async function getAgentResourceAllocation(_tenantId) {
    return {};
}
async function isOpenClawAvailable() {
    return (0, openclaw_bridge_1.bridgeIsOpenClawAvailable)();
}
async function getOpenClawServiceConfig() {
    return (0, openclaw_bridge_1.bridgeGetOpenClawServiceConfig)();
}
async function listOpenClawTools(ctx) {
    return (0, openclaw_bridge_1.bridgeListOpenClawTools)(ctx);
}
async function listOpenClawResources(uri, ctx) {
    return (0, openclaw_bridge_1.bridgeListOpenClawResources)(uri, ctx);
}
async function executeOpenClawTool(tool, input, ctx) {
    return (0, openclaw_bridge_1.bridgeExecuteOpenClawTool)(tool, input, ctx);
}
// Calibration shims — return empty proposal envelopes rather than throwing.
// The monolith call chain (modules/workflow/.../cooperative-workflows.routes.ts)
// has no real implementation either; routes that depend on these get a safe
// no-op response instead of HTTP 500.
async function proposeCalibration(tenantId, vendorId) {
    return {
        calibrationId: `calibration-${Date.now()}`,
        tenantId,
        vendorId,
        status: 'proposed',
        proposedAt: new Date().toISOString(),
    };
}
async function submitCalibration(tenantId, calibrationId, input) {
    return {
        calibrationId,
        tenantId,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        input,
    };
}
async function acceptCalibration(tenantId, calibrationId, userId) {
    return {
        calibrationId,
        tenantId,
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date().toISOString(),
    };
}
async function getCalibration(_tenantId, _calibrationId) {
    return null;
}
async function listCalibrations(_tenantId, _vendorId) {
    return [];
}
async function generateTeamRecommendation(tenantId, _input) {
    return { tenantId, generatedAt: new Date().toISOString(), recommendation: {} };
}
async function getTeamRecommendation(_tenantId) {
    return null;
}
async function saveTeamRecommendation(_tenantId, _rec) { }
async function applyTeamRecommendation(_tenantId, _recId) { }
function generateRoadmap(_profile) {
    return { tasks: [], generatedAt: new Date().toISOString() };
}
async function createRoadmap(_tenantId, roadmap) {
    return { ...roadmap, roadmapId: roadmap.roadmapId ?? 'roadmap-' + Date.now() };
}
async function getRoadmap(_tenantId) {
    return null;
}
async function updateTaskStatus(_tenantId, taskId, status) {
    return { taskId, title: '', status };
}
function getNextPendingTask(roadmap) {
    return roadmap.tasks.find(t => t.status !== 'done') ?? null;
}
async function getActivatedTemplates(_tenantId, _phaseType) {
    return [];
}
async function activateTemplateForPhase(_tenantId, _templateKey, _phaseType) { }
async function saveActivatedTemplate(_tenantId, _template) { }
async function getBusinessFunctions(_tenantId) {
    return [];
}
async function getStaffingForOrgSize(_tenantId, _size) {
    return {};
}
//# sourceMappingURL=legacy.js.map