/*
* Name: SerialEngineSetup
* @description: Sets up the initial Process Values.
* @date: 17/09/2025
* @author: Jamie Browning
* @version 1.00
*
* Version	Date Modified	Modified By					Description of the update
* V1.00		17/09/2025		Jamie Browning				Setup utility to seed Process__c with the example handler
*/
public with sharing class SerialEngineSetup {
    public static void ensureExampleProcess(){
        // Desired example processes in desired order
        Map<String> desired = new List<String>{
            'ProcessAccountPrimary',
            'ProcessContactEmails',
            'ProcessOppLineItems',
            'ProcessCaseContact'
        };

        // Use Custom Setting getters to avoid SOQL
        List<Process__c> insertProcesses = new List<Process__c>();
        Integer orderNum = 1;
        for(String nameKey : desired){
            Process__c existing = Process__c.getValues(nameKey);
            if(existing == null){
                Process__c rec = new Process__c(Name = nameKey);
                rec.put('Active__c', false); // default to off
                rec.put('Order__c', orderNum);
                rec.put('Handler_Class__c', nameKey);
                rec.put('Handler_Label__c', nameKey);
				if(rec.name == 'ProcessAccountPrimary') rec.put('Group__c', 'Daily');
				if(rec.name == 'ProcessContactEmails') rec.put('Group__c', 'Daily');
				if(rec.name == 'ProcessOppLineItems') rec.put('Group__c', 'Hourly');
				if(rec.name == 'ProcessCaseContact') rec.put('Group__c', 'Realtime');
                insertProcesses.add(rec);
            }
            orderNum++;
        }
        if(!insertProcesses.isEmpty()) insert insertProcesses;
    }
}