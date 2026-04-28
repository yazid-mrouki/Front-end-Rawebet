import { Pipe, PipeTransform } from '@angular/core';
import { LiveActivity } from '../../core/services/admin-activity.service';

type FeedFilter = 'all' | 'login' | 'register' | 'suspect' | 'ban' | 'loyalty';

@Pipe({ name: 'filterByType', standalone: true, pure: false })
export class FilterByTypePipe implements PipeTransform {

  private readonly map: Record<FeedFilter, string[]> = {
    all:      [],
    login:    ['user_login', 'face_login'],
    register: ['user_register'],
    suspect:  ['suspect_login'],
    ban:      ['user_ban'],
    loyalty:  ['loyalty_upgrade', 'loyalty_points'],
  };

  transform(activities: LiveActivity[], filter: FeedFilter): number {
    if (filter === 'all') return activities.length;
    return activities.filter(a => this.map[filter].includes(a.type)).length;
  }
}
