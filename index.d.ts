import IPackageJson from '@ts-type/package-dts'

export interface RegistryOptions {
    from: string
    to: string
}

export interface RepublishOptions {
    publishArgs?: string[]
    registry: string | RegistryOptions
    shouldUnpublish?: boolean
    packageJsonMutator?: (packageJson: IPackageJson) => IPackageJson
}
export function republishPackage(identifier: string, target: string, options: RepublishOptions): Promise<void>