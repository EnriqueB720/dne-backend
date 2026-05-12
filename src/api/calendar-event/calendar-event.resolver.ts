import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLFields, IGraphQLFields } from '@decorators';

import { CalendarEventService } from './calendar-event.service';
import { CalendarEvent, CalendarEventSelect } from './model';
import {
  CalendarEventArgs,
  CalendarEventCancelInput,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  CalendarEventsBySupplierArgs,
} from './dto';

@Resolver(() => CalendarEvent)
export class CalendarEventResolver {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Query(() => CalendarEvent)
  public async calendarEvent(
    @Args() args: CalendarEventArgs,
    @GraphQLFields() { fields }: IGraphQLFields<CalendarEventSelect>,
  ): Promise<CalendarEvent> {
    return await this.calendarEventService.findOne(args, fields);
  }

  @Query(() => [CalendarEvent])
  public async calendarEventsBySupplier(
    @Args() args: CalendarEventsBySupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<CalendarEventSelect>,
  ): Promise<CalendarEvent[]> {
    return await this.calendarEventService.findManyBySupplier(args, fields);
  }

  @Mutation(() => CalendarEvent)
  public async createCalendarEvent(
    @Args('data') data: CalendarEventCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<CalendarEventSelect>,
  ): Promise<CalendarEvent> {
    return await this.calendarEventService.create(data, fields);
  }

  @Mutation(() => CalendarEvent)
  public async updateCalendarEvent(
    @Args('data') data: CalendarEventUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<CalendarEventSelect>,
  ): Promise<CalendarEvent> {
    return await this.calendarEventService.update(data, fields);
  }

  @Mutation(() => CalendarEvent)
  public async cancelCalendarEvent(
    @Args('data') data: CalendarEventCancelInput,
    @GraphQLFields() { fields }: IGraphQLFields<CalendarEventSelect>,
  ): Promise<CalendarEvent> {
    return await this.calendarEventService.cancel(data, fields);
  }
}
