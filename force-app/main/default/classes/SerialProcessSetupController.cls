/*
* Name: SerialProcessSetupController
* @description: Exposes Custom Settings and provides a more intuitive UX
* @date: 17/09/2025
* @author: Jamie Browning
* @version 1.00
*
* Version	Date Modified	Modified By					Description of the update
* V1.00		17/09/2025		Jamie Browning				Initial Install of this Apex Controller
*/

public with sharing class SerialProcessSetupController {

	@AuraEnabled(cacheable=true)
	public static List<Process__c> getProcessSettings() {
		try {
			return [
				SELECT Id, Name, Active__c, Group__c, Handler_Class__c, Object__c, Order__c
				FROM Process__c
				ORDER BY Order__c ASC NULLS LAST, Name ASC
			];
		} catch (Exception e) {
			throw new AuraHandledException('Error retrieving process settings: ' + e.getMessage());
		}
	}

	@AuraEnabled
	public static void updateProcessSettings(List<Process__c> processSettings) {
		try {
			if (processSettings == null || processSettings.isEmpty()) {
				throw new AuraHandledException('No records provided for update');
			}

			// Validate required fields
			for (Process__c process : processSettings) {
				if (String.isBlank(process.Name)) {
					throw new AuraHandledException('Process Name is required');
				}
			}

			// For custom settings, we need to handle upsert logic
			List<Process__c> recordsToUpdate = new List<Process__c>();
			List<Process__c> recordsToInsert = new List<Process__c>();

			// Get existing records to determine if we need to update or insert
			Map<String, Process__c> existingRecords = new Map<String, Process__c>();
			for (Process__c existing : [SELECT Id, Name FROM Process__c WHERE Name IN :getRecordNames(processSettings)]) {
				existingRecords.put(existing.Name, existing);
			}

			for (Process__c process : processSettings) {
				if (existingRecords.containsKey(process.Name)) {
					// Update existing record
					Process__c existingRecord = existingRecords.get(process.Name);
					existingRecord.Active__c = process.Active__c;
					existingRecord.Group__c = process.Group__c;
					existingRecord.Handler_Class__c = process.Handler_Class__c;
					existingRecord.Object__c = process.Object__c;
					existingRecord.Order__c = process.Order__c;
					recordsToUpdate.add(existingRecord);
				} else {
					// Insert new record
					recordsToInsert.add(process);
				}
			}

			if (!recordsToUpdate.isEmpty()) {
				update recordsToUpdate;
			}

			if (!recordsToInsert.isEmpty()) {
				insert recordsToInsert;
			}

		} catch (DmlException e) {
			throw new AuraHandledException('Database error: ' + e.getDmlMessage(0));
		} catch (Exception e) {
			throw new AuraHandledException('Error updating process settings: ' + e.getMessage());
		}
	}

	private static Set<String> getRecordNames(List<Process__c> processes) {
		Set<String> names = new Set<String>();
		for (Process__c process : processes) {
			if (String.isNotBlank(process.Name)) {
				names.add(process.Name);
			}
		}
		return names;
	}
}