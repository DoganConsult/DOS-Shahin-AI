import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createActor, createMachine, type AnyStateMachine, type SnapshotFrom } from 'xstate';

@Injectable({ providedIn: 'root' })
export class XStateService implements OnDestroy {
  private actors = new Map<string, any>();
  private subjects = new Map<string, BehaviorSubject<any>>();

  createAndStart<T extends AnyStateMachine>(
    id: string,
    machine: T,
    input?: Record<string, unknown>,
  ): Observable<SnapshotFrom<T>> {
    this.stop(id);

    const actor = createActor(machine, { id, input } as any);
    const subject = new BehaviorSubject<SnapshotFrom<T>>(actor.getSnapshot());

    actor.subscribe((snapshot) => {
      subject.next(snapshot);
    });

    actor.start();
    this.actors.set(id, actor);
    this.subjects.set(id, subject);

    return subject.asObservable();
  }

  send(id: string, event: any): void {
    const actor = this.actors.get(id);
    if (actor) actor.send(event);
  }

  getSnapshot(id: string): any | null {
    const actor = this.actors.get(id);
    return actor ? actor.getSnapshot() : null;
  }

  stop(id: string): void {
    const actor = this.actors.get(id);
    if (actor) {
      actor.stop();
      this.actors.delete(id);
    }
    const subject = this.subjects.get(id);
    if (subject) {
      subject.complete();
      this.subjects.delete(id);
    }
  }

  ngOnDestroy(): void {
    for (const [id] of this.actors) {
      this.stop(id);
    }
  }
}
