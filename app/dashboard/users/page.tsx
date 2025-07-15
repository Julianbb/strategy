
import { Main } from '@/components/settings/main'

import { columns } from '@/components/strategies/users-columns'
import { UsersPrimaryButtons } from '@/components/strategies/users-primary-buttons'
import { UsersTable } from '@/components/strategies/users-table'

import { userListSchema } from '@/components/strategies/schema'
import { users } from '@/components/strategies/user'
import UsersProvider from '@/components/strategies/dialog/users-context'
import { UsersDialogs } from '@/components/strategies/dialog/users-dialogs'

export default function Users() {
  // Parse user list
  const userList = userListSchema.parse(users)

  return (
    <UsersProvider>
      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              Manage your users and their roles here.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <UsersTable data={userList} columns={columns} />
        </div>
      </Main>
      <UsersDialogs />
    </UsersProvider>
  )
}