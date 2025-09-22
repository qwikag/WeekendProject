import { LightningElement, track } from 'lwc';
import getProcessVariables from '@salesforce/apex/ProcessVariablesController.getProcessVariables';
import getProcessVariableLabels from '@salesforce/apex/ProcessVariablesController.getProcessVariableLabels';
import updateProcessVariables from '@salesforce/apex/ProcessVariablesController.updateProcessVariables';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ProcessVariables extends LightningElement {
    @track serialEngineOn = false;
    @track serialEngineTimestampDisplay = '—';
    @track labelSerialEngineOn = 'Serial Engine On';
    @track labelSerialEngineTimestamp = 'Serial Engine Timestamp';

    // Editable state
    @track editSerialEngineOn = false;
    @track editSerialEngineTimestamp = '';
    @track rawSerialEngineTimestamp = null;

    get pillClassSerialEngineOn(){
        return `pill ${this.serialEngineOn ? 'green' : 'red'}`;
    }
    get serialEngineOnPillLabel(){
        return this.serialEngineOn ? 'Running' : 'Stopped';
    }

    connectedCallback(){
        this.loadLabels();
        this.loadVars();
    }

    async loadVars(){
        try{
            const vars = await getProcessVariables();
            if(vars){
                this.serialEngineOn = vars.serialEngineOn === true;
                this.serialEngineTimestampDisplay = vars.serialEngineTimestamp
                    ? new Date(vars.serialEngineTimestamp).toLocaleString()
                    : '—';

                this.editSerialEngineOn = this.serialEngineOn;
                this.editSerialEngineTimestamp = vars.serialEngineTimestamp
                    ? this.toInputDateTimeLocal(new Date(vars.serialEngineTimestamp))
                    : '';
                this.rawSerialEngineTimestamp = vars.serialEngineTimestamp || null;
            }
        }catch(e){
            console.error('getProcessVariables error', e);
        }
    }

    async loadLabels(){
        try{
            const labels = await getProcessVariableLabels();
            if(labels){
                if(labels.serialEngineOn){
                    this.labelSerialEngineOn = labels.serialEngineOn;
                }
                if(labels.serialEngineTimestamp){
                    this.labelSerialEngineTimestamp = labels.serialEngineTimestamp;
                }
            }
        }catch(e){
            console.error('getProcessVariableLabels error', e);
        }
    }

    toInputDateTimeLocal(dateObj){
        // Return yyyy-MM-ddTHH:mm for lightning-input type="datetime-local"
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        const yyyy = dateObj.getFullYear();
        const mm = pad(dateObj.getMonth() + 1);
        const dd = pad(dateObj.getDate());
        const hh = pad(dateObj.getHours());
        const mi = pad(dateObj.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }

    handleToggleChange(event){
        this.editSerialEngineOn = event.target.checked;
    }

    handleTimestampChange(event){
        this.editSerialEngineTimestamp = event.target.value;
    }

    async handleSave(){
        try{
			//Date Bug to find, looks like a simple UTC conversion issue
            // Convert datetime-local value to ISO-like string Apex parser expects
            let tsIso = null;
            if(this.editSerialEngineTimestamp){
                // This will be yyyy-MM-ddTHH:mm or HH:mm:ss if supported; ensure seconds
                tsIso = this.editSerialEngineTimestamp;
                if(tsIso.length >= 16 && tsIso.length < 19){
                    tsIso += ':00';
                }
            }
            const dto = await updateProcessVariables({
                serialEngineOn: this.editSerialEngineOn,
                serialEngineTimestampIso: tsIso
            });
            // Apply returned values immediately
            if(dto){
                this.serialEngineOn = dto.serialEngineOn === true;
                this.serialEngineTimestampDisplay = dto.serialEngineTimestamp
                    ? new Date(dto.serialEngineTimestamp).toLocaleString()
                    : '—';
                this.editSerialEngineOn = this.serialEngineOn;
                this.editSerialEngineTimestamp = dto.serialEngineTimestamp
                    ? this.toInputDateTimeLocal(new Date(dto.serialEngineTimestamp))
                    : '';
                this.rawSerialEngineTimestamp = dto.serialEngineTimestamp || null;
            } else {
                await this.loadVars();
            }
            this.dispatchEvent(new ShowToastEvent({
                title: 'Saved',
                message: 'Process variables updated',
                variant: 'success'
            }));
        }catch(e){
            console.error('updateProcessVariables error', e);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error saving',
                message: (e && e.body && e.body.message) ? e.body.message : 'Unable to save changes',
                variant: 'error'
            }));
        }
    }

    handleCancel(){
        // Revert edits to last loaded/saved values
        this.editSerialEngineOn = this.serialEngineOn;
        this.editSerialEngineTimestamp = this.rawSerialEngineTimestamp
            ? this.toInputDateTimeLocal(new Date(this.rawSerialEngineTimestamp))
            : '';
    }
}