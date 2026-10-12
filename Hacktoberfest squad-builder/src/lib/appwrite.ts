import { Account, Client, Functions, TablesDB } from 'appwrite'
import { appwriteConfig, isConfigured } from './config'

export const client = new Client()

if (isConfigured) {
  client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId)
}

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const functions = new Functions(client)
