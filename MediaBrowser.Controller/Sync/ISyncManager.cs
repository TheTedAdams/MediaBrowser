﻿using MediaBrowser.Controller.Entities;
using MediaBrowser.Model.Dlna;
using MediaBrowser.Model.Events;
using MediaBrowser.Model.Querying;
using MediaBrowser.Model.Sync;
using MediaBrowser.Model.Users;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MediaBrowser.Controller.Sync
{
    public interface ISyncManager
    {
        event EventHandler<GenericEventArgs<SyncJobCreationResult>> SyncJobCreated;
        event EventHandler<GenericEventArgs<SyncJob>> SyncJobCancelled;
        event EventHandler<GenericEventArgs<SyncJob>> SyncJobUpdated;
        event EventHandler<GenericEventArgs<SyncJobItem>> SyncJobItemUpdated;
        event EventHandler<GenericEventArgs<SyncJobItem>> SyncJobItemCreated;

        /// <summary>
        /// Creates the job.
        /// </summary>
        /// <param name="request">The request.</param>
        /// <returns>Task.</returns>
        Task<SyncJobCreationResult> CreateJob(SyncJobRequest request);

        /// <summary>
        /// Gets the jobs.
        /// </summary>
        /// <returns>QueryResult&lt;SyncJob&gt;.</returns>
        Task<QueryResult<SyncJob>> GetJobs(SyncJobQuery query);

        /// <summary>
        /// Gets the job items.
        /// </summary>
        /// <param name="query">The query.</param>
        /// <returns>QueryResult&lt;SyncJobItem&gt;.</returns>
        QueryResult<SyncJobItem> GetJobItems(SyncJobItemQuery query);

        /// <summary>
        /// Gets the job.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>SyncJob.</returns>
        SyncJob GetJob(string id);

        /// <summary>
        /// Updates the job.
        /// </summary>
        /// <param name="job">The job.</param>
        /// <returns>Task.</returns>
        Task UpdateJob(SyncJob job);

        /// <summary>
        /// Res the enable job item.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task ReEnableJobItem(string id);

        /// <summary>
        /// Cnacels the job item.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task CancelJobItem(string id);

        /// <summary>
        /// Cancels the job.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task CancelJob(string id);

        /// <summary>
        /// Adds the parts.
        /// </summary>
        void AddParts(IEnumerable<ISyncProvider> providers);

        /// <summary>
        /// Gets the synchronize targets.
        /// </summary>
        IEnumerable<SyncTarget> GetSyncTargets(string userId);

        /// <summary>
        /// Supportses the synchronize.
        /// </summary>
        /// <param name="item">The item.</param>
        /// <returns><c>true</c> if XXXX, <c>false</c> otherwise.</returns>
        bool SupportsSync(BaseItem item);

        /// <summary>
        /// Gets the device profile.
        /// </summary>
        /// <param name="targetId">The target identifier.</param>
        /// <returns>DeviceProfile.</returns>
        DeviceProfile GetDeviceProfile(string targetId);

        /// <summary>
        /// Reports the synchronize job item transferred.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task ReportSyncJobItemTransferred(string id);

        /// <summary>
        /// Gets the job item.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>SyncJobItem.</returns>
        SyncJobItem GetJobItem(string id);

        /// <summary>
        /// Reports the offline action.
        /// </summary>
        /// <param name="action">The action.</param>
        /// <returns>Task.</returns>
        Task ReportOfflineAction(UserAction action);

        /// <summary>
        /// Gets the ready synchronize items.
        /// </summary>
        /// <param name="targetId">The target identifier.</param>
        /// <returns>List&lt;SyncedItem&gt;.</returns>
        Task<List<SyncedItem>> GetReadySyncItems(string targetId);

        /// <summary>
        /// Synchronizes the data.
        /// </summary>
        /// <param name="request">The request.</param>
        /// <returns>Task&lt;SyncDataResponse&gt;.</returns>
        Task<SyncDataResponse> SyncData(SyncDataRequest request);

        /// <summary>
        /// Marks the job item for removal.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task MarkJobItemForRemoval(string id);

        /// <summary>
        /// Unmarks the job item for removal.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task UnmarkJobItemForRemoval(string id);

        /// <summary>
        /// Gets the library item ids.
        /// </summary>
        /// <param name="query">The query.</param>
        /// <returns>QueryResult&lt;System.String&gt;.</returns>
        QueryResult<string> GetLibraryItemIds(SyncJobItemQuery query);

        /// <summary>
        /// Gets the audio options.
        /// </summary>
        /// <param name="jobItem">The job item.</param>
        /// <returns>AudioOptions.</returns>
        AudioOptions GetAudioOptions(SyncJobItem jobItem);

        /// <summary>
        /// Gets the video options.
        /// </summary>
        /// <param name="jobItem">The job item.</param>
        /// <param name="job">The job.</param>
        /// <returns>VideoOptions.</returns>
        VideoOptions GetVideoOptions(SyncJobItem jobItem, SyncJob job);

        /// <summary>
        /// Reports the synchronize job item transfer beginning.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task ReportSyncJobItemTransferBeginning(string id);

        /// <summary>
        /// Reports the synchronize job item transfer failed.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns>Task.</returns>
        Task ReportSyncJobItemTransferFailed(string id);
    }
}
