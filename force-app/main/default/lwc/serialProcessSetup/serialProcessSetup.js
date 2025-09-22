import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getProcessSettings from '@salesforce/apex/SerialProcessSetupController.getProcessSettings';
import updateProcessSettings from '@salesforce/apex/SerialProcessSetupController.updateProcessSettings';

export default class SerialProcessSetup extends LightningElement {
    @track processData = [];
    @track originalData = [];
    @track groupedProcessData = [];
    @track changedRecords = new Map();
    @track isLoading = false;

    wiredProcessResult;

    get hasChanges() {
        return this.changedRecords.size > 0;
    }

    columns = [
        {
            label: 'Name',
            fieldName: 'Name',
            type: 'text',
            editable: true
        },
        {
            label: 'Active',
            fieldName: 'Active__c',
            type: 'boolean',
            editable: true
        },
        {
            label: 'Group',
            fieldName: 'Group__c',
            type: 'text',
            editable: true
        },
        {
            label: 'Handler Class',
            fieldName: 'Handler_Class__c',
            type: 'text',
            editable: true
        },
        {
            label: 'Object',
            fieldName: 'Object__c',
            type: 'text',
            editable: true
        },
        {
            label: 'Order',
            fieldName: 'Order__c',
            type: 'number',
            editable: true
        }
    ];

    @wire(getProcessSettings)
    wiredProcess(result) {
        this.wiredProcessResult = result;
        if (result.data) {
            this.originalData = result.data.map(record => ({ ...record }));
            this.processData = result.data.map(record => ({
                ...record,
                Id: record.Id || record.Name,
                rowClass: this.getRowClass(record.Active__c)
            }));
            // Process grouped data
            this.processGroupedData();
            // Clear any existing changes
            this.changedRecords.clear();
        } else if (result.error) {
            this.showToast('Error', 'Error loading process settings: ' + result.error.body.message, 'error');
        }
    }

    handleTableEdit(event) {
        const recordId = event.target.dataset.id;
        const fieldName = event.target.dataset.field;
        let fieldValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

        // Convert numeric strings to numbers for Order__c
        if (fieldName === 'Order__c' && fieldValue !== '') {
            fieldValue = parseInt(fieldValue, 10);
        }

        // Update the processData
        this.processData = this.processData.map(record => {
            if (record.Id === recordId) {
                const updatedRecord = { ...record, [fieldName]: fieldValue };

                // Update row class if Active__c changed
                if (fieldName === 'Active__c') {
                    updatedRecord.rowClass = this.getRowClass(fieldValue);
                }

                // Track changes
                this.changedRecords.set(recordId, updatedRecord);

                return updatedRecord;
            }
            return record;
        });

        // Update grouped data to reflect changes
        this.processGroupedData();
    }

    getRowClass(isActive) {
        return isActive ? 'tr active' : 'tr inactive';
    }

    handleSaveChanges() {
        if (this.changedRecords.size === 0) {
            this.showToast('Info', 'No changes to save', 'info');
            return;
        }

        this.isLoading = true;
        const recordsToUpdate = Array.from(this.changedRecords.values());

        updateProcessSettings({ processSettings: recordsToUpdate })
            .then(() => {
                this.showToast('Success', 'Process settings updated successfully', 'success');
                this.changedRecords.clear();
                return refreshApex(this.wiredProcessResult);
            })
            .then(() => {
                // Update grouped data after refresh
                this.processGroupedData();
            })
            .catch(error => {
                this.showToast('Error', 'Error updating records: ' + error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleCancelChanges() {
        // Reset data to original state
        this.processData = this.originalData.map(record => ({
            ...record,
            Id: record.Id || record.Name,
            rowClass: this.getRowClass(record.Active__c)
        }));

        // Clear changes
        this.changedRecords.clear();

        // Update grouped data
        this.processGroupedData();

        this.showToast('Info', 'Changes cancelled', 'info');
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }

    processGroupedData() {
        if (!this.processData || this.processData.length === 0) {
            this.groupedProcessData = [];
            return;
        }

        // Group processes by Group__c
        const groupMap = new Map();

        this.processData.forEach(process => {
            const groupName = process.Group__c || 'Ungrouped';

            if (!groupMap.has(groupName)) {
                groupMap.set(groupName, []);
            }

            groupMap.get(groupName).push({
                ...process,
                statusClass: process.Active__c ? 'process-box active-process' : 'process-box inactive-process'
            });
        });

        // Convert to array and sort processes within each group by Order__c
        this.groupedProcessData = Array.from(groupMap.entries()).map(([groupName, processes]) => {
            // Sort processes by Order__c, then by Name
            const sortedProcesses = processes.sort((a, b) => {
                if (a.Order__c !== b.Order__c) {
                    return (a.Order__c || 999) - (b.Order__c || 999);
                }
                return a.Name.localeCompare(b.Name);
            });

            // Determine group status
            const allActive = sortedProcesses.every(process => process.Active__c);
            const allInactive = sortedProcesses.every(process => !process.Active__c);
            const activeCount = sortedProcesses.filter(process => process.Active__c).length;
            const totalCount = sortedProcesses.length;

            let headerClass;
            if (allActive) {
                headerClass = 'group-header active-group-header';
            } else if (allInactive) {
                headerClass = 'group-header inactive-group-header';
            } else {
                headerClass = 'group-header mixed-group-header';
            }

            return {
                groupName: groupName,
                processes: sortedProcesses,
                allActive: allActive,
                headerClass: headerClass,
                statusText: `${activeCount}/${totalCount} Active`
            };
        }).sort((a, b) => a.groupName.localeCompare(b.groupName));
    }
}