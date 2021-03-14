import { ISheetDocument } from "../models/sheetTypes";
import { ZavodLadderPosition } from "../models/zavodTypes";

export class ZavodLadder {
    private sheetDoc: ISheetDocument;
    private ladderPositions: ZavodLadderPosition[] = [];

    constructor() {
    }

    public parseDoc(sheet: ISheetDocument) {
        this.sheetDoc = sheet;

        let minPosition: number = 0;

        for (let i = 2; i < this.sheetDoc.feed.entry.length; i+=2) {
            const element = this.sheetDoc.feed.entry[i];
            const element2 = this.sheetDoc.feed.entry[i + 1];
            
            let pos: ZavodLadderPosition = {
                title: element2.content.$t,
                minPoints: Number(element.gs$cell.numericValue!),
                maxPoints: Number(element.gs$cell.numericValue!)
            }
            this.ladderPositions.push(pos);
            if (pos.maxPoints < minPosition) minPosition = pos.maxPoints;
        }
        this.ladderPositions.sort((a, b) => a.minPoints < b.minPoints ? -1 : 1);

        for (let i = 0; i < this.ladderPositions.length - 1; i++) {
            const curr = this.ladderPositions[i];
            const next = this.ladderPositions[i + 1];
            curr.maxPoints = next.minPoints - 1;
        }
        this.ladderPositions[0].minPoints = -999;
        this.ladderPositions[this.ladderPositions.length - 1].maxPoints = 999;
    }

    public getLadderPositionName(position: number): string {
        
        let step = this.ladderPositions.find(item => item.minPoints >= position && item.maxPoints <= position);
        if (step) return step.title;

        return '';
    }
}