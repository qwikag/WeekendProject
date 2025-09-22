/*
* Name: ProcessVariablesController
* @description: Provides access to org-level process variable settings for LWC consumption
* @date: 17/09/2025
* @author: Jamie Browning
* @version 1.00
*
* Version	Date Modified	Modified By					Description of the update
* V1.00		17/09/2025		Jamie Browning				Initial Install of this Apex Controller
*/

public with sharing class ProcessVariablesController {
    public class ProcessVariableDTO {
        @AuraEnabled public Boolean serialEngineOn;
        @AuraEnabled public Datetime serialEngineTimestamp;
    }

    @AuraEnabled
    public static ProcessVariableDTO getProcessVariables() {
        Process_Variables__c varsRec = Process_Variables__c.getOrgDefaults();
        ProcessVariableDTO dto = new ProcessVariableDTO();
        if (varsRec != null) {
            dto.serialEngineOn = varsRec.Serial_Engine_On__c;
            dto.serialEngineTimestamp = varsRec.Serial_Engine_Timestamp__c;
        }
        return dto;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getProcessVariableLabels() {
        Map<String, String> labels = new Map<String, String>();
        labels.put('serialEngineOn', Process_Variables__c.Serial_Engine_On__c.getDescribe().getLabel());
        labels.put('serialEngineTimestamp', Process_Variables__c.Serial_Engine_Timestamp__c.getDescribe().getLabel());
        return labels;
    }

    @AuraEnabled
    public static ProcessVariableDTO updateProcessVariables(Boolean serialEngineOn, String serialEngineTimestampIso) {
        Process_Variables__c pv = Process_Variables__c.getOrgDefaults();
        if (pv == null) {
            pv = new Process_Variables__c(SetupOwnerId = UserInfo.getOrganizationId());
        }

        pv.Serial_Engine_On__c = serialEngineOn;
        pv.Serial_Engine_Timestamp__c = parseIsoTimestamp(serialEngineTimestampIso);

        upsert pv;

        ProcessVariableDTO dto = new ProcessVariableDTO();
        dto.serialEngineOn = pv.Serial_Engine_On__c;
        dto.serialEngineTimestamp = pv.Serial_Engine_Timestamp__c;
        return dto;
    }

    private static Datetime parseIsoTimestamp(String isoValue) {
        if (String.isBlank(isoValue)) {
            return null;
        }

        String trimmed = isoValue.trim();
        if (trimmed.length() >= 16 && trimmed.length() < 19) {
            trimmed += ':00';
        }
        if (trimmed.length() >= 19) {
            String base = trimmed.substring(0, 19);
            return Datetime.valueOf(base.replace('T', ' '));
        }
        return null;
    }
}
